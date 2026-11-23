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

/** A one- or two-person business: the owner does the field work too (Q-16, D-043). */
describe('Owner field work (e2e, D-043)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let ownTeam: string;
  let ownJob: string;
  let staffJob: string;
  const op = (operation: string, entityId: string, payload: object = {}) => ({
    id: randomUUID(),
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
    a = await factory.create('Owner Field A', PREFIX_A);
    b = await factory.create('Owner Field B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    const c = (await http().post('/api/v1/customers').set(owner).send({ name: 'Ravi', phone: '9822033333', site: { addressLine1: 'Shop 4', locality: 'Andheri' } }).expect(201)).body.data;
    const staffTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Staff team', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
    staffJob = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: staffTeam }).expect(201)).body.data.id;
    ownTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Me', helperMemberIds: [a.memberIds.HELPER] }).expect(201)).body.data.id;
    ownJob = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: ownTeam, complaint: 'VRF outdoor unit noise', amountToCollect: 150000 }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('an owner not in a team has no field jobs and cannot start one', async () => {
    const org = await http().get('/api/v1/organization').set(as(a.tokens.OWNER)).expect(200);
    expect(org.body.data.inTeam).toBe(false);
    const mine = await http().get('/api/v1/my/jobs').set(as(a.tokens.OWNER)).expect(200);
    expect(mine.body.data).toEqual([]);
    const r = await send(a.tokens.OWNER, op('job.start', ownJob));
    expect(r.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' });
  });

  it('the owner joins their own team as its senior', async () => {
    const res = await http()
      .post(`/api/v1/teams/${ownTeam}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: a.memberIds.OWNER })
      .expect(201);
    expect(res.body.data.members.find((m: { memberId: string }) => m.memberId === a.memberIds.OWNER)).toMatchObject({
      position: 'SENIOR_TECHNICIAN',
      isPrimary: true,
    });
    const org = await http().get('/api/v1/organization').set(as(a.tokens.OWNER)).expect(200);
    expect(org.body.data.inTeam).toBe(true);
  });

  it('then sees only that team’s jobs, with full details, on My work and in sync', async () => {
    const mine = await http().get('/api/v1/my/jobs').set(as(a.tokens.OWNER)).expect(200);
    expect(mine.body.data.map((j: { id: string }) => j.id)).toEqual([ownJob]);
    expect(mine.body.data[0]).toMatchObject({ complaint: 'VRF outdoor unit noise', amountToCollect: 150000 });
    const boot = await http().get('/api/v1/sync/bootstrap').set(as(a.tokens.OWNER)).expect(200);
    expect(boot.body.data.jobs.map((j: { id: string }) => j.id)).toEqual([ownJob]);
  });

  it('starts and completes their own job, but not the staff team’s', async () => {
    const r = await send(a.tokens.OWNER, op('job.start', ownJob), op('job.complete', ownJob, { outcome: 'COMPLETED' }), op('job.start', staffJob));
    expect(r.body.data.results.map((x: { status: string }) => x.status)).toEqual(['applied', 'applied', 'rejected']);
    const job = await http().get(`/api/v1/jobs/${ownJob}`).set(as(a.tokens.OWNER)).expect(200);
    expect(job.body.data.status).toBe('COMPLETED');
  });

  it('cannot add another business’s owner to a team', async () => {
    await http()
      .post(`/api/v1/teams/${ownTeam}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: b.memberIds.OWNER })
      .expect(404);
  });
});
