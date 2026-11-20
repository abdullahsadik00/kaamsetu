import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000097';
const PREFIX_B = '90000098';

describe('Field: my jobs and sync operations (e2e, T4.7)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let jobId: string;
  let otherTeamJob: string;
  const op = (operation: string, entityId: string, payload: object = {}, id = randomUUID()) => ({
    id,
    operation,
    entityType: 'ServiceJob',
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  });
  const send = (token: string, ...ops: object[]) =>
    http().post('/api/v1/sync/operations').set(as(token)).send({ operations: ops }).expect(200);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Field A', PREFIX_A);
    b = await factory.create('Field B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    const c = (await http().post('/api/v1/customers').set(owner).send({ name: 'Meera', phone: '9822011111', site: { addressLine1: 'Flat 1', locality: 'Kothrud' } }).expect(201)).body.data;
    const myTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN, helperMemberIds: [a.memberIds.HELPER] }).expect(201)).body.data.id;
    const otherTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 2' }).expect(201)).body.data.id;
    jobId = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: myTeam, complaint: 'Not cooling', amountToCollect: 80000 }).expect(201)).body.data.id;
    otherTeamJob = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: otherTeam }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('the senior sees only their team’s jobs, with full details', async () => {
    const res = await http().get('/api/v1/my/jobs').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(200);
    expect(res.body.data.map((j: { id: string }) => j.id)).toEqual([jobId]);
    expect(res.body.data[0]).toMatchObject({ complaint: 'Not cooling', amountToCollect: 80000, locality: 'Kothrud', customer: { name: 'Meera' } });
  });

  it('the helper gets a slimmer view (Q-01) and cannot change jobs', async () => {
    const res = await http().get('/api/v1/my/jobs').set(as(a.tokens.HELPER)).expect(200);
    expect(res.body.data[0]).toMatchObject({ locality: 'Kothrud', customer: { name: 'Meera' } });
    expect(res.body.data[0]).not.toHaveProperty('amountToCollect');
    expect(res.body.data[0]).not.toHaveProperty('address');
    const r = await send(a.tokens.HELPER, op('job.start', jobId));
    expect(r.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'FORBIDDEN_ROLE' });
  });

  it('start, hold, start, complete from the phone; the owner sees each step', async () => {
    const start = op('job.start', jobId);
    const res = await send(
      a.tokens.SENIOR_TECHNICIAN,
      start,
      op('job.hold', jobId, { side: 'CUSTOMER', reason: 'Customer not home' }),
      op('job.start', jobId),
      op('job.complete', jobId, { outcome: 'COMPLETED' }),
    );
    expect(res.body.data.results.map((x: { status: string }) => x.status)).toEqual(['applied', 'applied', 'applied', 'applied']);
    const job = (await http().get(`/api/v1/jobs/${jobId}`).set(as(a.tokens.OWNER)).expect(200)).body.data;
    expect(job.status).toBe('COMPLETED');
    expect(job.history.map((h: { to: string }) => h.to)).toEqual(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'IN_PROGRESS', 'COMPLETED']);
    expect(job.history[3].note).toBe('Customer side: Customer not home');

    // Sending the same operation again (lost reply, app killed) is harmless.
    const again = await send(a.tokens.SENIOR_TECHNICIAN, start);
    expect(again.body.data.results[0]).toMatchObject({ id: start.id, status: 'duplicate' });
    // Same id, different content: refused.
    const reused = await send(a.tokens.SENIOR_TECHNICIAN, { ...start, operation: 'job.hold' });
    expect(reused.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'OPERATION_ID_REUSED' });
  });

  it('answers conflict for moves the job no longer allows, and keeps others apart', async () => {
    const done = await send(a.tokens.SENIOR_TECHNICIAN, op('job.start', jobId));
    expect(done.body.data.results[0]).toMatchObject({ status: 'conflict', code: 'INVALID_STATUS_TRANSITION' });
    const notMine = await send(a.tokens.SENIOR_TECHNICIAN, op('job.start', otherTeamJob));
    expect(notMine.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' });
    const otherBusiness = await send(b.tokens.SENIOR_TECHNICIAN, op('job.start', otherTeamJob));
    expect(otherBusiness.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' });
    await http().get('/api/v1/my/jobs').set(as(a.tokens.OWNER)).expect(403);
  });

  it('skips an operation whose dependency failed', async () => {
    const first = op('job.start', otherTeamJob);
    const res = await send(a.tokens.SENIOR_TECHNICIAN, first, { ...op('job.complete', otherTeamJob), dependsOn: first.id });
    expect(res.body.data.results[1]).toMatchObject({ status: 'rejected', code: 'DEPENDENCY_FAILED' });
  });
});
