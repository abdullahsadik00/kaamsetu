import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000095';
const PREFIX_B = '90000096';

describe('Jobs, owner side (e2e, T4.6)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let customerId: string;
  let siteId: string;
  let otherSiteAc: string;
  let ac1: string;
  let team1: string;
  let team2: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Jobs A', PREFIX_A);
    b = await factory.create('Jobs B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    const c = await http()
      .post('/api/v1/customers')
      .set(owner)
      .send({ name: 'Rohan K', phone: '9822012345', site: { addressLine1: 'Flat 4', locality: 'Aundh' } })
      .expect(201);
    customerId = c.body.data.id;
    siteId = c.body.data.sites[0].id;
    const withOffice = await http()
      .post(`/api/v1/customers/${customerId}/sites`)
      .set(owner)
      .send({ addressLine1: 'Office 2', locality: 'Baner' })
      .expect(201);
    const officeId = withOffice.body.data.sites.find((s: { id: string }) => s.id !== siteId).id;
    ac1 = (await http().post('/api/v1/equipment').set(owner).send({ customerId, siteId, type: 'SPLIT' }).expect(201)).body.data.id;
    otherSiteAc = (await http().post('/api/v1/equipment').set(owner).send({ customerId, siteId: officeId, type: 'SPLIT' }).expect(201)).body.data.id;
    team1 = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
    team2 = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 2' }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  let jobId: string;

  it('creates numbered jobs (#1001, #1002) for an address and its ACs', async () => {
    const first = await http()
      .post('/api/v1/jobs')
      .set(as(a.tokens.OWNER))
      .send({ customerId, siteId, equipmentIds: [ac1], type: 'REPAIR', complaint: 'Not cooling', scheduledDate: '2026-11-22', timeSlot: 'MORNING', amountToCollect: 120000 })
      .expect(201);
    expect(first.body.data).toMatchObject({
      jobNumber: 1001,
      status: 'NEW',
      customerName: 'Rohan K',
      place: 'Aundh',
      acCount: 1,
      scheduledDate: '2026-11-22',
      amountToCollect: 120000,
      version: 1,
    });
    jobId = first.body.data.id;
    const second = await http()
      .post('/api/v1/jobs')
      .set(as(a.tokens.OWNER))
      .send({ customerId, siteId, teamId: team1 })
      .expect(201);
    expect(second.body.data).toMatchObject({ jobNumber: 1002, status: 'ASSIGNED', teamName: 'Team 1' });
    // Numbers are per business.
    const c = await http()
      .post('/api/v1/customers')
      .set(as(b.tokens.OWNER))
      .send({ name: 'B cust', phone: '9822099999', site: { addressLine1: 'X 1' } })
      .expect(201);
    const other = await http()
      .post('/api/v1/jobs')
      .set(as(b.tokens.OWNER))
      .send({ customerId: c.body.data.id, siteId: c.body.data.sites[0].id })
      .expect(201);
    expect(other.body.data.jobNumber).toBe(1001);
  });

  it('only takes ACs at the job’s address', async () => {
    const res = await http()
      .post('/api/v1/jobs')
      .set(as(a.tokens.OWNER))
      .send({ customerId, siteId, equipmentIds: [otherSiteAc] })
      .expect(400);
    expect(res.body.error.code).toBe('EQUIPMENT_NOT_AT_SITE');
  });

  it('assigns, changes team (keeping history), lists by day and team', async () => {
    await http().post(`/api/v1/jobs/${jobId}/assign-team`).set(as(a.tokens.OWNER)).send({ teamId: team1 }).expect(200);
    const moved = await http().post(`/api/v1/jobs/${jobId}/assign-team`).set(as(a.tokens.OWNER)).send({ teamId: team2 }).expect(200);
    expect(moved.body.data).toMatchObject({ status: 'ASSIGNED', teamName: 'Team 2' });
    expect(moved.body.data.assignments).toHaveLength(2);
    expect(moved.body.data.assignments[0].unassignedAt).not.toBeNull();
    expect(moved.body.data.history.map((h: { to: string }) => h.to)).toEqual(['NEW', 'ASSIGNED', 'ASSIGNED']);

    const today = await http().get('/api/v1/jobs?date=2026-11-22').set(as(a.tokens.OWNER)).expect(200);
    expect(today.body.data.map((j: { jobNumber: number }) => j.jobNumber)).toEqual([1001]);
    const forTeam = await http().get(`/api/v1/jobs?teamId=${team1}`).set(as(a.tokens.OWNER)).expect(200);
    expect(forTeam.body.data.map((j: { jobNumber: number }) => j.jobNumber)).toEqual([1002]);
  });

  it('refuses stale edits with VERSION_CONFLICT', async () => {
    const job = (await http().get(`/api/v1/jobs/${jobId}`).set(as(a.tokens.OWNER)).expect(200)).body.data;
    await http().patch(`/api/v1/jobs/${jobId}`).set(as(a.tokens.OWNER)).send({ version: job.version, timeSlot: 'AFTERNOON' }).expect(200);
    const stale = await http().patch(`/api/v1/jobs/${jobId}`).set(as(a.tokens.OWNER)).send({ version: job.version, complaint: 'x' }).expect(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('cancels with a reason; a cancelled job cannot be assigned again', async () => {
    const res = await http().post(`/api/v1/jobs/${jobId}/cancel`).set(as(a.tokens.OWNER)).send({ reason: 'Customer will call back' }).expect(200);
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Customer will call back' });
    const again = await http().post(`/api/v1/jobs/${jobId}/assign-team`).set(as(a.tokens.OWNER)).send({ teamId: team1 }).expect(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    const open = await http().get('/api/v1/jobs?status=OPEN').set(as(a.tokens.OWNER)).expect(200);
    expect(open.body.data.map((j: { jobNumber: number }) => j.jobNumber)).toEqual([1002]);
  });

  it('creates a follow-up job linked to the earlier one', async () => {
    const res = await http().post(`/api/v1/jobs/${jobId}/follow-up`).set(as(a.tokens.OWNER)).expect(201);
    expect(res.body.data).toMatchObject({ followUpOfJobId: jobId, status: 'NEW', acCount: 1, type: 'REPAIR' });
  });

  it('keeps businesses apart and technicians out (their view comes with T4.7)', async () => {
    await http().get(`/api/v1/jobs/${jobId}`).set(as(b.tokens.OWNER)).expect(404);
    await http().post(`/api/v1/jobs/${jobId}/assign-team`).set(as(b.tokens.OWNER)).send({ teamId: team1 }).expect(404);
    await http().post('/api/v1/jobs').set(as(b.tokens.OWNER)).send({ customerId, siteId }).expect(404);
    await http().get('/api/v1/jobs').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
  });
});
