import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000041';
const PREFIX_B = '90000042';

/** YYYY-MM-DD in the business's time zone (new businesses use Asia/Kolkata). */
const dayIn = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(Date.now() + offset * 86_400_000),
  );

describe('Owner home dashboard (e2e, T4.12)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const owner = () => as(a.tokens.OWNER);
  const today = dayIn(0);
  let customerId: string;
  let siteId: string;
  let teamId: string;
  const jobs: Record<string, string> = {};

  const op = (operation: string, entityId: string, payload: object = {}) => ({
    id: randomUUID(),
    operation,
    entityType: 'ServiceJob',
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  });
  /** One field operation from the senior's phone (separate calls keep the history in order). */
  const field = async (operation: string, job: string, payload: object = {}) => {
    const res = await http()
      .post('/api/v1/sync/operations')
      .set(as(a.tokens.SENIOR_TECHNICIAN))
      .send({ operations: [op(operation, job, payload)] })
      .expect(200);
    expect(res.body.data.results[0].status).toBe('applied');
  };
  const job = async (body: object) =>
    (await http().post('/api/v1/jobs').set(owner()).send({ customerId, siteId, ...body }).expect(201)).body.data.id as string;
  const dashboard = async (token = a.tokens.OWNER) => (await http().get('/api/v1/dashboard').set(as(token)).expect(200)).body.data;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Dash A', PREFIX_A);
    b = await factory.create('Dash B', PREFIX_B);

    const c = (
      await http()
        .post('/api/v1/customers')
        .set(owner())
        .send({ name: 'Sunita Rao', phone: '9822011111', site: { addressLine1: 'Flat 2', locality: 'Aundh' } })
        .expect(201)
    ).body.data;
    customerId = c.id;
    siteId = c.sites[0].id;
    teamId = (
      await http().post('/api/v1/teams').set(owner()).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)
    ).body.data.id;

    // Enquiries: 2 WhatsApp + 1 call open, 1 closed.
    const enquiry = async (source: string) =>
      (await http().post('/api/v1/enquiries').set(owner()).send({ customerId, siteId, source }).expect(201)).body.data.id as string;
    await enquiry('WHATSAPP');
    await enquiry('PHONE');
    await enquiry('WHATSAPP');
    const closed = await enquiry('WHATSAPP');
    await http().post(`/api/v1/enquiries/${closed}/close`).set(owner()).send({ reason: 'Duplicate' }).expect(200);

    jobs.noTeamToday = await job({ scheduledDate: today });
    jobs.noTeamNoDate = await job({});
    jobs.heldOurs = await job({ teamId, scheduledDate: today });
    jobs.heldCustomer = await job({ teamId, scheduledDate: today });
    jobs.working = await job({ teamId, scheduledDate: today });
    jobs.followUp = await job({ teamId, scheduledDate: today });
    jobs.cancelled = await job({ teamId, scheduledDate: today });
    jobs.tomorrow = await job({ teamId, scheduledDate: dayIn(1) });
    jobs.teamNoDate = await job({ teamId });
    await http().post(`/api/v1/jobs/${jobs.cancelled}/cancel`).set(owner()).send({ reason: 'Customer cancelled' }).expect(200);

    await field('job.hold', jobs.heldOurs, { side: 'OURS', reason: 'Tool or gas missing' });
    await field('job.hold', jobs.heldCustomer, { side: 'CUSTOMER', reason: 'Customer not at home' });
    await field('job.start', jobs.working);
    await field('job.start', jobs.followUp);
    await field('job.complete', jobs.followUp, {
      outcome: 'NEEDS_FOLLOW_UP',
      note: 'Compressor noisy, come back',
      collected: { amount: 100000, mode: 'CASH' },
    });

    // A bill of ₹500 with ₹200 paid: ₹300 to collect.
    const bill = (
      await http()
        .post('/api/v1/bills')
        .set(owner())
        .send({ customerId, items: [{ description: 'Gas top-up', qty: 1, unitPrice: 50000 }] })
        .expect(201)
    ).body.data.id;
    await http().post(`/api/v1/bills/${bill}/issue`).set(owner()).expect(200);
    await http()
      .post(`/api/v1/bills/${bill}/payments`)
      .set(owner())
      .send({ amount: 20000, mode: 'UPI', idempotencyKey: randomUUID() })
      .expect(201);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('counts open enquiries by source, as the enquiries list shows them', async () => {
    const d = await dashboard();
    const list = (await http().get('/api/v1/enquiries?status=OPEN').set(owner()).expect(200)).body.data;
    expect(d.enquiries.open).toBe(3);
    expect(d.enquiries.open).toBe(list.length);
    expect(d.enquiries.bySource).toEqual({ WHATSAPP: 2, PHONE: 1 });
    expect(d.enquiries.newest).toEqual({ id: list[0].id, customerName: 'Sunita Rao' });
  });

  it('counts open jobs without a team; the next one is the earliest day', async () => {
    const d = await dashboard();
    const open = (await http().get('/api/v1/jobs?status=OPEN').set(owner()).expect(200)).body.data;
    expect(d.needTeam.count).toBe(2);
    expect(d.needTeam.count).toBe(open.filter((j: { teamId: string | null }) => !j.teamId).length);
    expect(d.needTeam.next).toMatchObject({ id: jobs.noTeamToday, customerName: 'Sunita Rao', scheduledDate: today });
  });

  it("counts today's jobs by status in the business's time zone, leaving out cancelled ones", async () => {
    const d = await dashboard();
    expect(d.today).toBe(today);
    const list = (await http().get(`/api/v1/jobs?date=${today}`).set(owner()).expect(200)).body.data as { status: string }[];
    const n = (s: string) => list.filter((j) => j.status === s).length;
    expect(d.todayByStatus).toEqual({
      total: list.filter((j) => j.status !== 'CANCELLED').length,
      NEW: n('NEW'),
      ASSIGNED: n('ASSIGNED'),
      IN_PROGRESS: n('IN_PROGRESS'),
      ON_HOLD: n('ON_HOLD'),
      COMPLETED: n('COMPLETED'),
    });
    expect(d.todayByStatus).toEqual({ total: 5, NEW: 1, ASSIGNED: 0, IN_PROGRESS: 1, ON_HOLD: 2, COMPLETED: 1 });
  });

  it('lists holds, follow-ups and jobs without a day under "needs your action"', async () => {
    const d = await dashboard();
    expect(d.needsAction.count).toBe(5);
    expect(d.needsAction.items.map((i: { kind: string; jobId: string }) => [i.kind, i.jobId])).toEqual([
      ['HOLD_OURS', jobs.heldOurs],
      ['HOLD_CUSTOMER', jobs.heldCustomer],
      ['FOLLOW_UP', jobs.followUp],
      ['NOT_SCHEDULED', jobs.teamNoDate],
      ['NOT_SCHEDULED', jobs.noTeamNoDate],
    ]);
    expect(d.needsAction.items[0]).toMatchObject({ note: 'Tool or gas missing', teamName: 'Team 1', customerName: 'Sunita Rao' });
    expect(d.needsAction.items[1].note).toBe('Customer not at home');
    expect(d.needsAction.items[2].note).toBe('Compressor noisy, come back');
    expect(d.needsAction.items[4].teamName).toBeNull();
  });

  it('shows the newest status changes made by the team, not by the owner', async () => {
    const d = await dashboard();
    expect(d.latest.map((l: { toStatus: string; jobId: string }) => [l.toStatus, l.jobId])).toEqual([
      ['COMPLETED', jobs.followUp],
      ['IN_PROGRESS', jobs.followUp],
      ['IN_PROGRESS', jobs.working],
      ['ON_HOLD', jobs.heldCustomer],
      ['ON_HOLD', jobs.heldOurs],
    ]);
    expect(d.latest[3]).toMatchObject({ note: 'Customer not at home', by: 'Dash A SENIOR_TECHNICIAN', customerName: 'Sunita Rao' });
  });

  it('takes money from the billing summary', async () => {
    const d = await dashboard();
    const summary = (await http().get('/api/v1/billing/summary').set(owner()).expect(200)).body.data;
    expect(d.money).toEqual({
      toCollect: summary.toCollect,
      cashWithTeams: summary.cashWithTeams,
      cashCount: summary.cash.length,
      readyToBill: summary.readyToBill.length,
    });
    expect(d.money).toEqual({ toCollect: 30000, cashWithTeams: 100000, cashCount: 1, readyToBill: 1 });
  });

  it('drops a follow-up once the owner makes the follow-up job', async () => {
    const created = (await http().post(`/api/v1/jobs/${jobs.followUp}/follow-up`).set(owner()).expect(201)).body.data.id;
    const d = await dashboard();
    const kinds = d.needsAction.items.map((i: { kind: string; jobId: string }) => [i.kind, i.jobId]);
    expect(kinds).not.toContainEqual(['FOLLOW_UP', jobs.followUp]);
    // The new job has no team and no day yet.
    expect(kinds).toContainEqual(['NOT_SCHEDULED', created]);
    expect(d.needTeam.count).toBe(3);
  });

  it("keeps each business's numbers apart", async () => {
    const empty = await dashboard(b.tokens.OWNER);
    expect(empty).toMatchObject({
      enquiries: { open: 0, bySource: {}, newest: null },
      needTeam: { count: 0, next: null },
      needsAction: { count: 0, items: [] },
      todayByStatus: { total: 0 },
      latest: [],
      money: { toCollect: 0, cashWithTeams: 0, cashCount: 0, readyToBill: 0 },
    });
    // B's own enquiry shows only on B's home.
    const bc = (
      await http()
        .post('/api/v1/customers')
        .set(as(b.tokens.OWNER))
        .send({ name: 'B Customer', phone: '9822022222', site: { addressLine1: 'Shop 1' } })
        .expect(201)
    ).body.data;
    await http().post('/api/v1/enquiries').set(as(b.tokens.OWNER)).send({ customerId: bc.id, siteId: bc.sites[0].id }).expect(201);
    expect((await dashboard(b.tokens.OWNER)).enquiries.open).toBe(1);
    expect((await dashboard()).enquiries.open).toBe(3);
  });

  it('is for the owner only', async () => {
    for (const role of ['SENIOR_TECHNICIAN', 'HELPER'] as const) {
      const res = await http().get('/api/v1/dashboard').set(as(a.tokens[role])).expect(403);
      expect(res.body.error.code).toBeDefined();
    }
    await http().get('/api/v1/dashboard').expect(401);
  });
});
