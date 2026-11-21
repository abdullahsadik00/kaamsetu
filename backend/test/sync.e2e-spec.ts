import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000079';
const PREFIX_B = '90000069';

type Job = { id: string; status: string; scheduledDate: string | null; customer: { name: string } | null; amountToCollect?: number };
type Changes = { cursor: string; jobs: Job[]; removed: string[]; more: boolean; reset: boolean };

describe('Sync: bootstrap and changes (e2e, T4.9, D-035)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let owner: ReturnType<typeof as>;
  let customer: { id: string; sites: { id: string }[] };
  let myTeam: string;
  let otherTeam: string;
  let jobId: string;
  let otherTeamJob: string;

  const op = (operation: string, entityId: string, payload: object = {}, id = randomUUID(), createdAt = new Date().toISOString()) => ({
    id,
    operation,
    entityType: 'ServiceJob',
    entityId,
    payload,
    createdAt,
  });
  const send = async (token: string, ...ops: object[]) =>
    (await http().post('/api/v1/sync/operations').set(as(token)).send({ operations: ops }).expect(200)).body.data.results as {
      id: string;
      status: string;
      code?: string;
    }[];
  const bootstrap = async (token: string) =>
    (await http().get('/api/v1/sync/bootstrap').set(as(token)).expect(200)).body.data as { cursor: string; jobs: Job[] };
  const changes = async (token: string, cursor: string) =>
    (await http().get('/api/v1/sync/changes').query({ cursor }).set(as(token)).expect(200)).body.data as Changes;
  const newJob = async (teamId: string, extra: object = {}) =>
    (await http().post('/api/v1/jobs').set(owner).send({ customerId: customer.id, siteId: customer.sites[0].id, teamId, ...extra }).expect(201)).body.data
      .id as string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Sync A', PREFIX_A);
    b = await factory.create('Sync B', PREFIX_B);
    owner = as(a.tokens.OWNER);
    customer = (await http().post('/api/v1/customers').set(owner).send({ name: 'Meera', phone: '9822011111', site: { addressLine1: 'Flat 1', locality: 'Kothrud' } }).expect(201))
      .body.data;
    myTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN, helperMemberIds: [a.memberIds.HELPER] }).expect(201))
      .body.data.id;
    otherTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 2' }).expect(201)).body.data.id;
    jobId = await newJob(myTeam, { complaint: 'Not cooling', amountToCollect: 80000, scheduledDate: '2026-11-21' });
    otherTeamJob = await newJob(otherTeam);
  });

  afterAll(async () => {
    await prisma.syncCounter.deleteMany({ where: { organizationId: { in: [a.organizationId, b.organizationId] } } });
    await factory.cleanUp();
    await app.close();
  });

  it('bootstrap: the senior gets their team’s open jobs in full, with a cursor', async () => {
    const res = await bootstrap(a.tokens.SENIOR_TECHNICIAN);
    expect(res.jobs.map((j) => j.id)).toEqual([jobId]);
    expect(res.jobs[0]).toMatchObject({ status: 'ASSIGNED', complaint: 'Not cooling', amountToCollect: 80000, address: 'Flat 1, Kothrud', customer: { name: 'Meera' } });
    expect(res.cursor).toMatch(/^\d+$/);
    expect(BigInt(res.cursor)).toBeGreaterThan(0n);
  });

  it('bootstrap: the helper gets the slimmer view (Q-01); the owner and other businesses get nothing', async () => {
    const res = await bootstrap(a.tokens.HELPER);
    expect(res.jobs.map((j) => j.id)).toEqual([jobId]);
    expect(res.jobs[0]).toMatchObject({ locality: 'Kothrud', customer: { name: 'Meera' } });
    expect(res.jobs[0]).not.toHaveProperty('amountToCollect');
    expect(res.jobs[0]).not.toHaveProperty('address');
    await http().get('/api/v1/sync/bootstrap').set(owner).expect(403);
    expect((await bootstrap(b.tokens.SENIOR_TECHNICIAN)).jobs).toEqual([]);
  });

  it('changes: nothing new gives the same cursor; a bad cursor is refused', async () => {
    const { cursor } = await bootstrap(a.tokens.SENIOR_TECHNICIAN);
    expect(await changes(a.tokens.SENIOR_TECHNICIAN, cursor)).toEqual({ cursor, jobs: [], removed: [], more: false, reset: false });
    await http().get('/api/v1/sync/changes').query({ cursor: 'abc' }).set(as(a.tokens.SENIOR_TECHNICIAN)).expect(400);
    await http().get('/api/v1/sync/changes').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(400);
  });

  it('changes: a newly assigned job and a rescheduled one arrive; the cursor only moves forward', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const c0 = (await bootstrap(senior)).cursor;
    const fresh = await newJob(myTeam, { scheduledDate: '2026-11-22' });
    const c1 = await changes(senior, c0);
    expect(c1.jobs.map((j) => j.id)).toEqual([fresh]);
    expect(BigInt(c1.cursor)).toBeGreaterThan(BigInt(c0));

    const version = (await http().get(`/api/v1/jobs/${jobId}`).set(owner).expect(200)).body.data.version;
    await http().patch(`/api/v1/jobs/${jobId}`).set(owner).send({ version, scheduledDate: '2026-11-23' }).expect(200);
    const c2 = await changes(senior, c1.cursor);
    expect(c2.jobs).toEqual([expect.objectContaining({ id: jobId, scheduledDate: '2026-11-23' })]);
    expect(c2.removed).toEqual([]);
    expect(BigInt(c2.cursor)).toBeGreaterThan(BigInt(c1.cursor));

    // Asking again from an older cursor is safe: the same rows come back (the phone upserts).
    const again = await changes(senior, c0);
    expect(again.jobs.map((j) => j.id).sort()).toEqual([fresh, jobId].sort());
    expect(again.cursor).toBe(c2.cursor);
  });

  it('changes: a customer edit reaches the job card', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const c0 = (await bootstrap(senior)).cursor;
    await http().patch(`/api/v1/customers/${customer.id}`).set(owner).send({ name: 'Meera Joshi' }).expect(200);
    const c1 = await changes(senior, c0);
    expect(c1.jobs.length).toBeGreaterThan(0);
    expect(c1.jobs.every((j) => j.customer?.name === 'Meera Joshi')).toBe(true);
  });

  it('changes: jobs given to another team or cancelled come back as removals (tombstones)', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const moved = await newJob(myTeam);
    const cancelled = await newJob(myTeam);
    const c0 = (await bootstrap(senior)).cursor;

    await http().post(`/api/v1/jobs/${moved}/assign-team`).set(owner).send({ teamId: otherTeam }).expect(200);
    await http().post(`/api/v1/jobs/${cancelled}/cancel`).set(owner).send({ reason: 'Customer called off' }).expect(200);
    const c1 = await changes(senior, c0);
    expect(c1.removed.sort()).toEqual([moved, cancelled].sort());
    expect(c1.jobs).toEqual([]);
    expect((await bootstrap(senior)).jobs.map((j) => j.id)).not.toContain(moved);

    // The helper's phone gets the same removals.
    expect((await changes(a.tokens.HELPER, c0)).removed.sort()).toEqual([moved, cancelled].sort());
  });

  it('changes: other teams’ and other businesses’ work never shows, not even as an id', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const c0 = (await bootstrap(senior)).cursor;
    const theirs = await newJob(otherTeam);
    await http().post(`/api/v1/jobs/${otherTeamJob}/cancel`).set(owner).send({ reason: 'Not needed' }).expect(200);
    const c1 = await changes(senior, c0);
    expect(c1.jobs).toEqual([]);
    expect(c1.removed).toEqual([]);
    expect(BigInt(c1.cursor)).toBeGreaterThan(BigInt(c0));

    // Business B with A's cursor: nothing of A, and told to start over if the cursor is ahead of B.
    const bChanges = await changes(b.tokens.SENIOR_TECHNICIAN, '0');
    expect(bChanges.jobs).toEqual([]);
    expect(bChanges.removed).not.toContain(theirs);
    expect(await changes(b.tokens.SENIOR_TECHNICIAN, c1.cursor)).toMatchObject({ reset: true, jobs: [], removed: [] });
  });

  it('conflict: completing a job the owner cancelled meanwhile is refused with a reason, and the report is kept', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const j = await newJob(myTeam);
    expect((await send(senior, op('job.start', j)))[0].status).toBe('applied');
    await http().post(`/api/v1/jobs/${j}/cancel`).set(owner).send({ reason: 'Customer called off' }).expect(200);

    const finish = op('job.complete', j, { outcome: 'COMPLETED', collected: { amount: 50000, mode: 'CASH' } });
    const [r] = await send(senior, finish);
    expect(r).toMatchObject({ id: finish.id, status: 'conflict', code: 'JOB_CANCELLED' });
    const kept = await prisma.syncOperation.findUnique({ where: { id: finish.id } });
    expect(kept).toMatchObject({ result: 'conflict', errorCode: 'JOB_CANCELLED', payload: { outcome: 'COMPLETED', collected: { amount: 50000, mode: 'CASH' } } });
    // No money row or report on a cancelled job; sending again gives the same verdict, not "duplicate".
    expect(await prisma.cashCollection.count({ where: { jobId: j } })).toBe(0);
    expect((await send(senior, finish))[0]).toMatchObject({ status: 'conflict', code: 'JOB_CANCELLED' });
    expect(await prisma.syncOperation.count({ where: { id: finish.id } })).toBe(1);
  });

  it('conflict: work on a job given to another team says so', async () => {
    const j = await newJob(myTeam);
    await http().post(`/api/v1/jobs/${j}/assign-team`).set(owner).send({ teamId: otherTeam }).expect(200);
    const [r] = await send(a.tokens.SENIOR_TECHNICIAN, op('job.start', j));
    expect(r).toMatchObject({ status: 'conflict', code: 'JOB_REASSIGNED' });
  });

  it('two phones on the same job: a second start is harmless, a second finish is refused', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const j = await newJob(myTeam);
    expect((await send(senior, op('job.start', j), op('job.start', j))).map((r) => r.status)).toEqual(['applied', 'applied']);
    const [first, second] = await send(senior, op('job.complete', j), op('job.complete', j, { outcome: 'NEEDS_FOLLOW_UP' }));
    expect(first.status).toBe('applied');
    expect(second).toMatchObject({ status: 'conflict', code: 'JOB_ALREADY_COMPLETED' });
    const job = (await http().get(`/api/v1/jobs/${j}`).set(owner).expect(200)).body.data;
    expect(job.history.filter((h: { to: string }) => h.to === 'IN_PROGRESS')).toHaveLength(1);
    expect(job.report.outcome).toBe('COMPLETED');
  });

  it('duplicate operation ids: in one batch and across batches only one change is made', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const j = await newJob(myTeam);
    const start = op('job.start', j);
    expect((await send(senior, start, start)).map((r) => r.status)).toEqual(['applied', 'duplicate']);
    expect((await send(senior, start))[0].status).toBe('duplicate');
    const job = (await http().get(`/api/v1/jobs/${j}`).set(owner).expect(200)).body.data;
    expect(job.history.map((h: { to: string }) => h.to)).toEqual(['NEW', 'ASSIGNED', 'IN_PROGRESS']);
  });

  it('a phone clock a day ahead does not matter: server time is used', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const j = await newJob(myTeam);
    const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString();
    const before = Date.now();
    expect((await send(senior, op('job.complete', j, {}, randomUUID(), tomorrow)))[0].status).toBe('applied');
    const row = await prisma.serviceJob.findUniqueOrThrow({ where: { id: j } });
    expect(row.completedAt!.getTime()).toBeLessThan(before + 60_000);
  });

  it('a job finished today stays on the phone as done; changes show it', async () => {
    const senior = a.tokens.SENIOR_TECHNICIAN;
    const j = await newJob(myTeam);
    const c0 = (await bootstrap(senior)).cursor;
    await send(senior, op('job.complete', j));
    expect((await changes(senior, c0)).jobs).toEqual([expect.objectContaining({ id: j, status: 'COMPLETED' })]);
    expect((await bootstrap(senior)).jobs.find((x) => x.id === j)?.status).toBe('COMPLETED');
  });

  it('someone taken off the team gets the team’s jobs as removals', async () => {
    const helper = a.tokens.HELPER;
    const { cursor, jobs } = await bootstrap(helper);
    expect(jobs.length).toBeGreaterThan(0);
    await http().delete(`/api/v1/teams/${myTeam}/members/${a.memberIds.HELPER}`).set(owner).expect(200);
    const c1 = await changes(helper, cursor);
    expect(c1.jobs).toEqual([]);
    expect(c1.removed.sort()).toEqual(jobs.map((j) => j.id).sort());
    expect((await bootstrap(helper)).jobs).toEqual([]);
  });
});
