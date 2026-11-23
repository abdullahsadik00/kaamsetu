import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX = '90000086';
const DAY = 86_400_000;

/** Plans, trial end, 7 grace days, then view-only (D-045, T7.1). */
describe('Plans (e2e, D-045)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let factory: TenantFactory;
  let a: TestTenant;
  let c: { id: string; sites: { id: string }[] };
  let team: string;
  let job: string;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const ago = (days: number) => new Date(Date.now() - days * DAY);

  /** Sets the business's subscription row. */
  const setSub = (data: { plan?: string; status?: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'; endsDaysAgo: number }) => {
    const end = ago(data.endsDaysAgo);
    const row = { plan: data.plan ?? 'TRIAL', status: data.status ?? 'TRIALING', currentPeriodEnd: end, trialEndsAt: end };
    return prisma.subscription.upsert({
      where: { organizationId: a.organizationId },
      create: { organizationId: a.organizationId, ...row },
      update: row,
    });
  };
  const plan = async () => (await http().get('/api/v1/organization').set(as(a.tokens.OWNER)).expect(200)).body.data.plan;
  const newCustomer = (n: string) =>
    http().post('/api/v1/customers').set(as(a.tokens.OWNER)).send({ name: 'Asha', phone: `${PREFIX}${n}`, site: { addressLine1: 'Flat 2' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Plans A', PREFIX);
    const owner = as(a.tokens.OWNER);
    await setSub({ endsDaysAgo: -10 });
    c = (await newCustomer('11').expect(201)).body.data;
    team = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
    job = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: team }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany({ where: { organizationId: a.organizationId } });
    await factory.cleanUp();
    await app.close();
  });

  it('lists the plans with the one that fits the business type', async () => {
    const res = (await http().get('/api/v1/plans').set(as(a.tokens.OWNER)).expect(200)).body.data;
    expect(res.plans.map((p: { id: string; monthly: number }) => [p.id, p.monthly])).toEqual([
      ['SOLO', 29_900],
      ['CREW', 49_900],
      ['BUSINESS', 149_900],
    ]);
    expect(res).toMatchObject({ suggested: 'BUSINESS', graceDays: 7 });
    await http().get('/api/v1/plans').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
  });

  it('only the owner sees the plan', async () => {
    expect(await plan()).toMatchObject({ plan: 'TRIAL', status: 'TRIALING', access: 'FULL' });
    const staff = (await http().get('/api/v1/organization').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(200)).body.data;
    expect(staff.plan).toBeNull();
  });

  it('during the 7 grace days everything still works', async () => {
    await setSub({ endsDaysAgo: 3 });
    expect(await plan()).toMatchObject({ access: 'GRACE' });
    await newCustomer('12').expect(201);
  });

  describe('after the grace days: view-only', () => {
    beforeAll(() => setSub({ endsDaysAgo: 8 }));

    it('refuses new work with PLAN_ENDED, online and offline', async () => {
      expect(await plan()).toMatchObject({ access: 'READ_ONLY' });
      expect((await newCustomer('13').expect(402)).body.error.code).toBe('PLAN_ENDED');
      const offline = {
        id: randomUUID(),
        operation: 'customer.create',
        entityType: 'Customer',
        entityId: randomUUID(),
        payload: { name: 'Ravi', phone: `${PREFIX}14`, siteId: randomUUID(), site: { addressLine1: 'X' } },
        dependsOn: null,
        createdAt: new Date().toISOString(),
      };
      const res = await http().post('/api/v1/sync/operations').set(as(a.tokens.OWNER)).send({ operations: [offline] }).expect(200);
      expect(res.body.data.results[0]).toMatchObject({ status: 'rejected', code: 'PLAN_ENDED' });
    });

    it('still shows everything and exports', async () => {
      await http().get('/api/v1/customers').set(as(a.tokens.OWNER)).expect(200);
      await http().get(`/api/v1/jobs/${job}`).set(as(a.tokens.OWNER)).expect(200);
      await http().get('/api/v1/organization/export').set(as(a.tokens.OWNER)).expect(200);
    });

    it('the team can still finish work already given to them', async () => {
      const start = { id: randomUUID(), operation: 'job.start', entityType: 'ServiceJob', entityId: job, payload: {}, createdAt: new Date().toISOString() };
      const res = await http().post('/api/v1/sync/operations').set(as(a.tokens.SENIOR_TECHNICIAN)).send({ operations: [start] }).expect(200);
      expect(res.body.data.results[0].status).toBe('applied');
    });

    it('the owner can cancel a job and change the business type to fit a cheaper plan', async () => {
      await http().post(`/api/v1/jobs/${job}/cancel`).set(as(a.tokens.OWNER)).send({ reason: 'Customer cancelled' }).expect((r) => expect(r.status).not.toBe(402));
      await http().post('/api/v1/organization/business-type').set(as(a.tokens.OWNER)).send({ businessType: 'VENDOR' }).expect(200);
    });

    it('a cancelled subscription is view-only too', async () => {
      await setSub({ plan: 'BUSINESS', status: 'CANCELLED', endsDaysAgo: -30 });
      expect(await plan()).toMatchObject({ plan: 'BUSINESS', access: 'READ_ONLY' });
    });
  });

  describe('paid plans', () => {
    it('a paid plan works again and shows its end date', async () => {
      await setSub({ plan: 'BUSINESS', status: 'ACTIVE', endsDaysAgo: -30 });
      expect(await plan()).toMatchObject({ plan: 'BUSINESS', status: 'ACTIVE', access: 'FULL' });
      await newCustomer('15').expect(201);
    });

    it('a plan allows only its business types; a trial allows all', async () => {
      await setSub({ plan: 'SOLO', status: 'ACTIVE', endsDaysAgo: -30 });
      const res = await http().post('/api/v1/organization/business-type').set(as(a.tokens.OWNER)).send({ businessType: 'CREW' }).expect(409);
      expect(res.body.error.code).toBe('PLAN_DOES_NOT_ALLOW');
    });

    it('the Business plan has up to 10 active teams', async () => {
      await setSub({ plan: 'BUSINESS', status: 'ACTIVE', endsDaysAgo: -30 });
      const active = await prisma.team.count({ where: { organizationId: a.organizationId, active: true } });
      for (let i = active; i < 10; i++) {
        await http().post('/api/v1/teams').set(as(a.tokens.OWNER)).send({ name: `Team ${i + 1}` }).expect(201);
      }
      const res = await http().post('/api/v1/teams').set(as(a.tokens.OWNER)).send({ name: 'Team 11' }).expect(409);
      expect(res.body.error.code).toBe('TEAM_LIMIT');

      // Turning one off makes room; turning it back on when full is refused.
      await http().patch(`/api/v1/teams/${team}`).set(as(a.tokens.OWNER)).send({ active: false }).expect(200);
      await http().post('/api/v1/teams').set(as(a.tokens.OWNER)).send({ name: 'Team 11' }).expect(201);
      expect((await http().patch(`/api/v1/teams/${team}`).set(as(a.tokens.OWNER)).send({ active: true }).expect(409)).body.error.code).toBe('TEAM_LIMIT');
    });
  });
});
