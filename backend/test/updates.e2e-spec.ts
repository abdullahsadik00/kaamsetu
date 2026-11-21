import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000031';
const PREFIX_B = '90000032';

type Item = {
  id: string;
  kind: string;
  jobId: string;
  jobNumber: number | null;
  customerName: string | null;
  by: string;
  at: string;
  status?: string;
  side?: string | null;
  note?: string | null;
  appointment?: { date: string; slot: string };
  part?: { name: string; qty: number; canContinue: boolean };
  operation?: string;
  code?: string | null;
  payload?: unknown;
};
type Page = { items: Item[]; nextCursor: string | null; unread: number; seenUpTo: string | null };

describe('Job updates feed (e2e, T4.7)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let owner: ReturnType<typeof as>;
  let customerId: string;
  let siteId: string;
  let myTeam: string;
  let otherTeam: string;

  const op = (operation: string, entityId: string, payload: object = {}, id = randomUUID()) => ({
    id,
    operation,
    entityType: 'ServiceJob',
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  });
  const send = async (token: string, ...ops: object[]) =>
    (await http().post('/api/v1/sync/operations').set(as(token)).send({ operations: ops }).expect(200)).body.data.results as {
      id: string;
      status: string;
      code?: string;
    }[];
  const senior = () => a.tokens.SENIOR_TECHNICIAN;
  const newJob = async (teamId: string | null, extra: object = {}) =>
    (await http().post('/api/v1/jobs').set(owner).send({ customerId, siteId, ...(teamId ? { teamId } : {}), ...extra }).expect(201)).body.data
      .id as string;
  const feed = async (query: Record<string, string | number> = {}, token = a.tokens.OWNER) =>
    (await http().get('/api/v1/updates').query(query).set(as(token)).expect(200)).body.data as Page;
  const getJob = async (id: string) => (await http().get(`/api/v1/jobs/${id}`).set(owner).expect(200)).body.data;
  const dashboard = async () => (await http().get('/api/v1/dashboard').set(owner).expect(200)).body.data;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Updates A', PREFIX_A);
    b = await factory.create('Updates B', PREFIX_B);
    owner = as(a.tokens.OWNER);
    const c = (
      await http()
        .post('/api/v1/customers')
        .set(owner)
        .send({ name: 'Sunita Rao', phone: '9822011111', site: { addressLine1: 'Flat 2', locality: 'Aundh' } })
        .expect(201)
    ).body.data;
    customerId = c.id;
    siteId = c.sites[0].id;
    myTeam = (
      await http()
        .post('/api/v1/teams')
        .set(owner)
        .send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN, helperMemberIds: [a.memberIds.HELPER] })
        .expect(201)
    ).body.data.id;
    otherTeam = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 2' }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await prisma.syncCounter.deleteMany({ where: { organizationId: { in: [a.organizationId, b.organizationId] } } });
    await factory.cleanUp();
    await app.close();
  });

  it('appointment fixed: recorded, moves the job’s day and slot, and sends the job to the team’s phones again', async () => {
    const job = await newJob(myTeam);
    const before = await getJob(job);
    const { cursor } = (await http().get('/api/v1/sync/bootstrap').set(as(senior())).expect(200)).body.data;

    const fix = op('job.appointment', job, { date: '2026-12-01', slot: 'AFTERNOON' });
    expect(await send(senior(), fix)).toEqual([{ id: fix.id, status: 'applied' }]);

    const after = await getJob(job);
    expect(after).toMatchObject({ scheduledDate: '2026-12-01', timeSlot: 'AFTERNOON', status: 'ASSIGNED', version: before.version + 1 });
    expect(after.updates[0]).toMatchObject({ id: fix.id, kind: 'APPOINTMENT_FIXED', appointment: { date: '2026-12-01', slot: 'AFTERNOON' } });

    // The sync trigger bumped the job: the next pull brings the new day.
    const changes = (await http().get('/api/v1/sync/changes').query({ cursor }).set(as(senior())).expect(200)).body.data;
    expect(changes.jobs).toEqual([expect.objectContaining({ id: job, scheduledDate: '2026-12-01', timeSlot: 'AFTERNOON' })]);
  });

  it('part needed and note: recorded without a status change; repeats are duplicates, a reused id is refused', async () => {
    const job = await newJob(myTeam);
    const part = op('job.part', job, { part: 'MCB 16A', qty: 1, canContinue: false, note: 'Old one burnt' });
    const note = op('job.note', job, { text: 'Outdoor unit on terrace' });
    expect((await send(senior(), part, note)).map((r) => r.status)).toEqual(['applied', 'applied']);
    expect((await send(senior(), part, note)).map((r) => r.status)).toEqual(['duplicate', 'duplicate']);
    const reused = await send(senior(), { ...note, payload: { text: 'Something else' } });
    expect(reused[0]).toMatchObject({ status: 'rejected', code: 'OPERATION_ID_REUSED' });

    expect(await prisma.jobUpdate.count({ where: { jobId: job } })).toBe(2);
    const j = await getJob(job);
    expect(j.status).toBe('ASSIGNED');
    expect(j.updates.map((u: Item) => u.kind)).toEqual(['NOTE', 'PART_NEEDED']);
    expect(j.updates[1]).toMatchObject({ part: { name: 'MCB 16A', qty: 1, canContinue: false }, note: 'Old one burnt', by: 'Updates A SENIOR_TECHNICIAN' });
    expect(j.updates[0]).toMatchObject({ note: 'Outdoor unit on terrace', customerName: 'Sunita Rao' });
  });

  it('bad bodies are refused with VALIDATION_FAILED', async () => {
    const job = await newJob(myTeam);
    const res = await send(
      senior(),
      op('job.note', job, { text: '   ' }),
      op('job.part', job, { qty: 2 }),
      op('job.appointment', job, { date: 'tomorrow', slot: 'MORNING' }),
      op('job.appointment', job, { date: '2026-12-01', slot: 'NIGHT' }),
    );
    expect(res.map((r) => r.code)).toEqual(['VALIDATION_FAILED', 'VALIDATION_FAILED', 'VALIDATION_FAILED', 'VALIDATION_FAILED']);
    expect(await prisma.jobUpdate.count({ where: { jobId: job } })).toBe(0);
  });

  it('scope: another team’s job, another business’s job and the helper are refused like other operations', async () => {
    const theirs = await newJob(otherTeam);
    const [r1] = await send(senior(), op('job.note', theirs, { text: 'Hello' }));
    expect(r1).toMatchObject({ status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' });

    const mine = await newJob(myTeam);
    const [r2] = await send(b.tokens.SENIOR_TECHNICIAN, op('job.part', mine, { part: 'Capacitor' }));
    expect(r2).toMatchObject({ status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' });
    const [r3] = await send(a.tokens.HELPER, op('job.note', mine, { text: 'Reached site' }));
    expect(r3).toMatchObject({ status: 'rejected', code: 'FORBIDDEN_ROLE' });

    // Moved to another team after the phone saw it: a conflict, schedule untouched.
    const moved = await newJob(myTeam, { scheduledDate: '2026-12-05', timeSlot: 'MORNING' });
    await http().post(`/api/v1/jobs/${moved}/assign-team`).set(owner).send({ teamId: otherTeam }).expect(200);
    const [r4] = await send(senior(), op('job.appointment', moved, { date: '2026-12-09', slot: 'EVENING' }));
    expect(r4).toMatchObject({ status: 'conflict', code: 'JOB_REASSIGNED' });
    expect(await getJob(moved)).toMatchObject({ scheduledDate: '2026-12-05', timeSlot: 'MORNING' });
    expect(await prisma.jobUpdate.count({ where: { jobId: { in: [theirs, mine, moved] } } })).toBe(0);
  });

  it('appointment fixed on a finished job is kept in the feed but does not move the job', async () => {
    const job = await newJob(myTeam, { scheduledDate: '2026-11-30', timeSlot: 'MORNING' });
    await send(senior(), op('job.complete', job, { outcome: 'COMPLETED' }));
    const [r] = await send(senior(), op('job.appointment', job, { date: '2026-12-10', slot: 'EVENING' }));
    expect(r.status).toBe('applied');
    expect(await getJob(job)).toMatchObject({ status: 'COMPLETED', scheduledDate: '2026-11-30', timeSlot: 'MORNING' });
  });

  it('feed: newest first, status changes and refused work included, pages with a cursor without gaps or repeats', async () => {
    const job = await newJob(myTeam);
    await send(senior(), op('job.start', job));
    await send(senior(), op('job.note', job, { text: 'Reached site' }));
    await send(senior(), op('job.hold', job, { side: 'CUSTOMER', reason: 'Customer not at home' }));
    await http().post(`/api/v1/jobs/${job}/cancel`).set(owner).send({ reason: 'Called off' }).expect(200);
    const refused = op('job.start', job);
    expect((await send(senior(), refused))[0]).toMatchObject({ status: 'conflict', code: 'JOB_CANCELLED' });

    const first = await feed();
    const top = first.items.slice(0, 4);
    expect(top.map((i) => i.kind)).toEqual(['REFUSED', 'STATUS', 'NOTE', 'STATUS']);
    expect(top[0]).toMatchObject({ id: refused.id, jobId: job, operation: 'job.start', code: 'JOB_CANCELLED', by: 'Updates A SENIOR_TECHNICIAN' });
    expect(top[1]).toMatchObject({ status: 'ON_HOLD', side: 'CUSTOMER', note: 'Customer not at home' });
    expect(top[3]).toMatchObject({ status: 'IN_PROGRESS' });
    // The owner's own changes (create, assign, cancel) are not "updates from teams".
    expect(first.items.every((i) => i.by !== 'Updates A OWNER')).toBe(true);
    const times = first.items.map((i) => new Date(i.at).getTime());
    expect([...times].sort((x, y) => y - x)).toEqual(times);

    // The job page shows the same rows for that job, refused work with its reason.
    const page = await getJob(job);
    expect(page.updates.map((u: Item) => u.id)).toEqual(first.items.filter((i) => i.jobId === job).map((i) => i.id));

    // Paging two at a time gives every row once, in the same order.
    const all: Item[] = [];
    let cursor: string | null = null;
    do {
      const p: Page = await feed(cursor ? { limit: 2, cursor } : { limit: 2 });
      all.push(...p.items);
      cursor = p.nextCursor;
    } while (cursor);
    expect(all.map((i) => i.id)).toEqual((await feed({ limit: 50 })).items.map((i) => i.id));
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);

    // "Delays & parts": holds, parts and refused work only.
    const problems = await feed({ filter: 'PROBLEMS', limit: 50 });
    expect(problems.items.length).toBeGreaterThan(0);
    expect(problems.items.every((i) => i.kind === 'PART_NEEDED' || i.kind === 'REFUSED' || i.status === 'ON_HOLD')).toBe(true);

    await http().get('/api/v1/updates').query({ cursor: 'nope' }).set(owner).expect(400);
  });

  it('unread: counts rows after the owner’s "seen up to" time, which only moves forward', async () => {
    const before = await feed();
    expect(before.unread).toBeGreaterThan(0);
    expect(before.seenUpTo).toBeNull();
    const newest = before.items[0].at;
    const seen = (await http().post('/api/v1/updates/seen').set(owner).send({ upTo: newest }).expect(200)).body.data;
    expect(seen).toMatchObject({ unread: 0, seenUpTo: newest });
    expect((await dashboard()).updates.unread).toBe(0);

    const job = await newJob(myTeam);
    await send(senior(), op('job.note', job, { text: 'Running late, 30 min' }));
    expect((await feed()).unread).toBe(1);
    // An older time does not move it back.
    await http().post('/api/v1/updates/seen').set(owner).send({ upTo: '2020-01-01T00:00:00.000Z' }).expect(200);
    expect((await feed()).unread).toBe(1);
    const d = await dashboard();
    expect(d.updates.unread).toBe(1);
    expect(d.updates.latest[0]).toMatchObject({ kind: 'NOTE', note: 'Running late, 30 min' });
    await http().post('/api/v1/updates/seen').set(owner).send({ upTo: 'yesterday' }).expect(400);
  });

  it('roles and isolation: owner only; another business sees none of it', async () => {
    await http().get('/api/v1/updates').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().get('/api/v1/updates').set(as(a.tokens.HELPER)).expect(403);
    await http().post('/api/v1/updates/seen').set(as(a.tokens.HELPER)).send({ upTo: new Date().toISOString() }).expect(403);
    const other = await feed({}, b.tokens.OWNER);
    // B only sees B's own refused attempt (its senior tried A's job), without A's job number or customer.
    expect(other.items.every((i) => i.jobNumber === null && i.customerName === null)).toBe(true);
    expect(other.items.map((i) => i.kind)).toEqual(['REFUSED']);
    expect((await dashboard()).updates.latest.every((i: Item) => i.jobNumber !== null)).toBe(true);
  });

  it('dashboard: "Part needed" is its own kind, once per job, and leaves when the job is closed', async () => {
    const job = await newJob(myTeam, { scheduledDate: '2026-12-02' });
    const count0 = (await dashboard()).needsAction.count;
    await send(senior(), op('job.part', job, { part: 'Capacitor', qty: 2 }));
    // A hold on the same job does not add a second row.
    await send(senior(), op('job.hold', job, { side: 'OURS', reason: 'Part not available' }));
    const d1 = await dashboard();
    expect(d1.needsAction.count).toBe(count0 + 1);
    const rows = d1.needsAction.items.filter((i: { jobId: string }) => i.jobId === job);
    expect(rows).toEqual([expect.objectContaining({ kind: 'PART_NEEDED', note: '2 × Capacitor', teamName: 'Team 1', customerName: 'Sunita Rao' })]);
    expect(d1.needsAction.items[0].kind).toBe('PART_NEEDED');

    await send(senior(), op('job.start', job));
    await send(senior(), op('job.complete', job, { outcome: 'COMPLETED' }));
    const d2 = await dashboard();
    expect(d2.needsAction.items.some((i: { jobId: string }) => i.jobId === job)).toBe(false);
    expect(d2.needsAction.count).toBe(count0);
  });
});
