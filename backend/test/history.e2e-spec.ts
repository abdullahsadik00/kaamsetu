import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000053';
const PREFIX_B = '90000054';

describe('Customer and AC history (e2e, T4.4)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let customerId: string;
  let hall: string;
  let bedroom: string;
  let doneJob: string;
  let openJob: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('History A', PREFIX_A);
    b = await factory.create('History B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    const c = (await http().post('/api/v1/customers').set(owner).send({ name: 'Meera', phone: '9822012345', site: { addressLine1: 'Flat 1', locality: 'Kothrud' } }).expect(201)).body.data;
    customerId = c.id;
    const siteId = c.sites[0].id;
    const ac = (locationLabel: string) =>
      http().post('/api/v1/equipment').set(owner).send({ customerId, siteId, type: 'SPLIT', brand: 'Voltas', capacityTons: 1.5, locationLabel }).expect(201);
    hall = (await ac('Hall')).body.data.id;
    bedroom = (await ac('Bedroom')).body.data.id;
    const team = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
    const job = (body: object) => http().post('/api/v1/jobs').set(owner).send({ customerId, siteId, teamId: team, ...body }).expect(201);
    doneJob = (await job({ equipmentIds: [hall, bedroom], scheduledDate: '2026-11-20', complaint: 'Not cooling' })).body.data.id;
    openJob = (await job({ type: 'REPAIR', equipmentIds: [hall], scheduledDate: '2026-11-25' })).body.data.id;

    const finish = {
      id: randomUUID(),
      operation: 'job.complete',
      entityType: 'ServiceJob',
      entityId: doneJob,
      createdAt: new Date().toISOString(),
      payload: {
        outcome: 'COMPLETED',
        note: 'All good',
        work: [
          { equipmentId: hall, work: ['CLEANED', 'GAS_FILLED'], note: 'Gas was low' },
          { equipmentId: bedroom, work: ['CLEANED'] },
        ],
        parts: [{ name: 'Capacitor', qty: 1 }],
      },
    };
    const sent = await http().post('/api/v1/sync/operations').set(as(a.tokens.SENIOR_TECHNICIAN)).send({ operations: [finish] }).expect(200);
    expect(sent.body.data.results[0].status).toBe('applied');
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it("customer history lists the customer's jobs, newest first, with team and report", async () => {
    const res = await http().get(`/api/v1/customers/${customerId}/history`).set(as(a.tokens.OWNER)).expect(200);
    const jobs = res.body.data;
    expect(jobs.map((j: { id: string }) => j.id)).toEqual([openJob, doneJob]);
    expect(jobs[0]).toMatchObject({ type: 'REPAIR', status: 'ASSIGNED', scheduledDate: '2026-11-25', team: 'Team 1', outcome: null });
    expect(jobs[1]).toMatchObject({ status: 'COMPLETED', complaint: 'Not cooling', outcome: 'COMPLETED', reportNote: 'All good', parts: [{ name: 'Capacitor', qty: 1 }] });
    expect(jobs[1].completedAt).toEqual(expect.any(String));
    expect(jobs[1]).not.toHaveProperty('work');
  });

  it('AC history has the AC and only its jobs, with the work done on that AC', async () => {
    const h = (await http().get(`/api/v1/equipment/${hall}/history`).set(as(a.tokens.OWNER)).expect(200)).body.data;
    expect(h.equipment).toMatchObject({ id: hall, locationLabel: 'Hall', brand: 'Voltas', capacityTons: 1.5 });
    expect(h.jobs.map((j: { id: string }) => j.id)).toEqual([openJob, doneJob]);
    expect(h.jobs[1]).toMatchObject({ work: ['CLEANED', 'GAS_FILLED'], workNote: 'Gas was low' });
    expect(h.jobs[0]).toMatchObject({ work: [], workNote: null });

    const bed = (await http().get(`/api/v1/equipment/${bedroom}/history`).set(as(a.tokens.OWNER)).expect(200)).body.data;
    expect(bed.jobs.map((j: { id: string }) => j.id)).toEqual([doneJob]);
    expect(bed.jobs[0]).toMatchObject({ work: ['CLEANED'], workNote: null });
  });

  it('keeps other businesses and staff out', async () => {
    await http().get(`/api/v1/customers/${customerId}/history`).set(as(b.tokens.OWNER)).expect(404);
    await http().get(`/api/v1/equipment/${hall}/history`).set(as(b.tokens.OWNER)).expect(404);
    await http().get(`/api/v1/equipment/${hall}/history`).set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().get(`/api/v1/customers/${customerId}/history`).set(as(a.tokens.HELPER)).expect(403);
  });
});
