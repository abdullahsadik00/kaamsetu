import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { dayIn } from '../src/field/scope.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000045';
const PREFIX_B = '90000046';

type Job = { id: string };
type Changes = { cursor: string; jobs: Job[]; removed: string[]; more: boolean; reset: boolean };
type Lending = { lendingId: string; memberId: string; name: string; fromTeamName: string | null; toTeamName: string };
type Team = { id: string; name: string; day: string; lentOut: Lending[]; borrowed: Lending[] };
type Crew = { memberId: string; position: string; lentFromTeamName: string | null; borrowed: boolean }[];

const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

describe('One-day helper swap (e2e, T4.6, D-038)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let owner: ReturnType<typeof as>;
  let helper: ReturnType<typeof as>;
  let helperId: string;
  let senior2Id: string;
  let helper2Id: string;
  let goneHelperId: string;
  let team1: string;
  let team2: string;
  let team3: string;
  let j1Today: string;
  let j1Tomorrow: string;
  let j2Today: string;
  let j2Tomorrow: string;
  let today: string;
  let tomorrow: string;

  const ids = (jobs: Job[]) => jobs.map((j) => j.id).sort();
  const bootstrap = async () =>
    (await http().get('/api/v1/sync/bootstrap').set(helper).expect(200)).body.data as { cursor: string; jobs: Job[] };
  const changes = async (token: ReturnType<typeof as>, cursor: string) =>
    (await http().get('/api/v1/sync/changes').query({ cursor }).set(token).expect(200)).body.data as Changes;
  const myJobs = async (q: object = {}) =>
    (await http().get('/api/v1/my/jobs').query(q).set(helper).expect(200)).body.data as Job[];
  const lend = (teamId: string, body: object, token = owner) =>
    http().post(`/api/v1/teams/${teamId}/day-helpers`).set(token).send(body);
  const crew = async (jobId: string) =>
    (await http().get(`/api/v1/jobs/${jobId}`).set(owner).expect(200)).body.data.crew as Crew;

  const person = async (org: string, phone: string, role: 'SENIOR_TECHNICIAN' | 'HELPER', name: string, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') => {
    const user = await prisma.user.create({ data: { phone, name } });
    return (await prisma.organizationMember.create({ data: { organizationId: org, userId: user.id, role, status } })).id;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Swap A', PREFIX_A);
    b = await factory.create('Swap B', PREFIX_B);
    owner = as(a.tokens.OWNER);
    helper = as(a.tokens.HELPER);
    helperId = a.memberIds.HELPER;
    senior2Id = await person(a.organizationId, `+91${PREFIX_A}11`, 'SENIOR_TECHNICIAN', 'Prakash');
    helper2Id = await person(a.organizationId, `+91${PREFIX_A}12`, 'HELPER', 'Sunil');
    goneHelperId = await person(a.organizationId, `+91${PREFIX_A}13`, 'HELPER', 'Gone', 'INACTIVE');
    today = dayIn('Asia/Kolkata', new Date());
    tomorrow = plusDays(today, 1);

    const customer = (
      await http().post('/api/v1/customers').set(owner).send({ name: 'Meera', phone: '9822011111', site: { addressLine1: 'Flat 1', locality: 'Kothrud' } }).expect(201)
    ).body.data as { id: string; sites: { id: string }[] };
    const team = async (body: object) => (await http().post('/api/v1/teams').set(owner).send(body).expect(201)).body.data.id as string;
    team1 = await team({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN, helperMemberIds: [helperId] });
    team2 = await team({ name: 'Team 2', seniorMemberId: senior2Id, helperMemberIds: [helper2Id] });
    team3 = await team({ name: 'Team 3' });
    const job = async (teamId: string, scheduledDate: string) =>
      (await http().post('/api/v1/jobs').set(owner).send({ customerId: customer.id, siteId: customer.sites[0].id, teamId, scheduledDate }).expect(201)).body.data
        .id as string;
    j1Today = await job(team1, today);
    j1Tomorrow = await job(team1, tomorrow);
    j2Today = await job(team2, today);
    j2Tomorrow = await job(team2, tomorrow);
  });

  afterAll(async () => {
    await prisma.syncCounter.deleteMany({ where: { organizationId: { in: [a.organizationId, b.organizationId] } } });
    await factory.cleanUp();
    await prisma.user.deleteMany({ where: { phone: { startsWith: `+91${PREFIX_A}1` } } });
    await app.close();
  });

  it('before any swap the helper holds their own team’s jobs', async () => {
    expect(ids((await bootstrap()).jobs)).toEqual([j1Today, j1Tomorrow].sort());
    const teams = (await http().get('/api/v1/teams').set(owner).expect(200)).body.data as Team[];
    expect(teams.every((t) => t.day === today && t.lentOut.length === 0 && t.borrowed.length === 0)).toBe(true);
  });

  it('only the owner may lend a helper', async () => {
    await lend(team2, { memberId: helperId, day: today }, as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await lend(team2, { memberId: helperId, day: today }, helper).expect(403);
  });

  it('refuses past days, days too far ahead, non-helpers, removed people, inactive teams, own team and bad input', async () => {
    const code = async (teamId: string, body: object, status: number) => (await lend(teamId, body).expect(status)).body.error.code as string;
    expect(await code(team2, { memberId: helperId, day: plusDays(today, -1) }, 400)).toBe('DAY_IN_PAST');
    expect(await code(team2, { memberId: helperId, day: plusDays(today, 31) }, 400)).toBe('DAY_TOO_FAR');
    expect(await code(team2, { memberId: a.memberIds.SENIOR_TECHNICIAN, day: today }, 400)).toBe('NOT_A_HELPER');
    expect(await code(team2, { memberId: a.memberIds.OWNER, day: today }, 400)).toBe('NOT_A_HELPER');
    expect(await code(team2, { memberId: goneHelperId, day: today }, 400)).toBe('EMPLOYEE_NOT_ACTIVE');
    expect(await code(team1, { memberId: helperId, day: today }, 409)).toBe('ALREADY_IN_TEAM');
    await http().patch(`/api/v1/teams/${team3}`).set(owner).send({ active: false }).expect(200);
    expect(await code(team3, { memberId: helperId, day: today }, 400)).toBe('TEAM_NOT_ACTIVE');
    await http().patch(`/api/v1/teams/${team3}`).set(owner).send({ active: true }).expect(200);
    expect(await code(team2, { memberId: helperId, day: '22-11-2026' }, 400)).toBe('VALIDATION_FAILED');
    expect(await code(team2, { memberId: helperId }, 400)).toBe('VALIDATION_FAILED');
    expect(await prisma.teamDayHelper.count({ where: { organizationId: a.organizationId } })).toBe(0);
  });

  it('lending moves the helper to the other team for that day only, via sync changes and /my/jobs', async () => {
    const c0 = (await bootstrap()).cursor;
    const seniorC0 = (await http().get('/api/v1/sync/bootstrap').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(200)).body.data.cursor as string;

    const res = (await lend(team2, { memberId: helperId, day: today }).expect(201)).body.data as Team;
    expect(res).toMatchObject({ id: team2, day: today, lentOut: [] });
    expect(res.borrowed).toEqual([expect.objectContaining({ memberId: helperId, fromTeamName: 'Team 1', toTeamName: 'Team 2' })]);

    // The phone picks it up: Team 2's job today arrives, Team 1's job today leaves; tomorrow is untouched.
    const ch = await changes(helper, c0);
    expect(ids(ch.jobs)).toEqual([j2Today]);
    expect(ch.removed).toEqual([j1Today]);
    expect(ids((await bootstrap()).jobs)).toEqual([j1Tomorrow, j2Today].sort());
    expect(ids(await myJobs())).toEqual([j1Tomorrow, j2Today].sort());
    expect(ids(await myJobs({ date: today }))).toEqual([j2Today]);
    expect(ids(await myJobs({ date: tomorrow }))).toEqual([j1Tomorrow]);
    expect(ids((await bootstrap()).jobs)).not.toContain(j2Tomorrow);

    // The team's senior keeps all of Team 1's jobs; nothing of Team 2 leaks to them.
    const senior = await changes(as(a.tokens.SENIOR_TECHNICIAN), seniorC0);
    expect(senior.removed).toEqual([]);
    expect(ids(senior.jobs)).toEqual([j1Today]);
  });

  it('teams list and job pages show the day’s crew', async () => {
    const teams = (await http().get('/api/v1/teams').query({ day: today }).set(owner).expect(200)).body.data as Team[];
    const t1 = teams.find((t) => t.id === team1)!;
    const t2 = teams.find((t) => t.id === team2)!;
    expect(t1.lentOut).toEqual([expect.objectContaining({ memberId: helperId, toTeamName: 'Team 2' })]);
    expect(t2.borrowed).toEqual([expect.objectContaining({ memberId: helperId, fromTeamName: 'Team 1' })]);
    const next = (await http().get(`/api/v1/teams/${team1}`).query({ day: tomorrow }).set(owner).expect(200)).body.data as Team;
    expect(next).toMatchObject({ day: tomorrow, lentOut: [], borrowed: [] });

    expect((await crew(j2Today)).map((c) => [c.memberId, c.borrowed, c.lentFromTeamName])).toEqual([
      [senior2Id, false, null],
      [helper2Id, false, null],
      [helperId, true, 'Team 1'],
    ]);
    expect((await crew(j1Today)).map((c) => c.memberId)).toEqual([a.memberIds.SENIOR_TECHNICIAN]);
    expect((await crew(j1Tomorrow)).map((c) => c.memberId)).toEqual([a.memberIds.SENIOR_TECHNICIAN, helperId]);
  });

  it('one team per helper per day', async () => {
    expect((await lend(team3, { memberId: helperId, day: today }).expect(409)).body.error.code).toBe('ALREADY_LENT');
  });

  it('another business cannot see, lend or undo', async () => {
    const other = as(b.tokens.OWNER);
    const lending = (await http().get(`/api/v1/teams/${team2}`).set(owner).expect(200)).body.data.borrowed[0] as Lending;
    expect((await lend(team2, { memberId: helperId, day: tomorrow }, other).expect(404)).body.error.code).toBe('TEAM_NOT_FOUND');
    const bTeam = (await http().post('/api/v1/teams').set(other).send({ name: 'B1' }).expect(201)).body.data.id as string;
    expect((await lend(bTeam, { memberId: helperId, day: tomorrow }, other).expect(404)).body.error.code).toBe('EMPLOYEE_NOT_FOUND');
    await http().delete(`/api/v1/teams/${team2}/day-helpers/${lending.lendingId}`).set(other).expect(404);
    const bTeams = (await http().get('/api/v1/teams').set(other).expect(200)).body.data as Team[];
    expect(bTeams.flatMap((t) => [...t.lentOut, ...t.borrowed])).toEqual([]);
    expect((await http().get('/api/v1/sync/bootstrap').set(as(b.tokens.HELPER)).expect(200)).body.data.jobs).toEqual([]);
  });

  it('undo brings the helper back to their own team; the borrowed job comes back as a removal', async () => {
    const c0 = (await bootstrap()).cursor;
    const lending = (await http().get(`/api/v1/teams/${team2}`).set(owner).expect(200)).body.data.borrowed[0] as Lending;
    await http().delete(`/api/v1/teams/${team2}/day-helpers/${lending.lendingId}`).set(helper).expect(403);
    await http().delete(`/api/v1/teams/${team1}/day-helpers/${lending.lendingId}`).set(owner).expect(404);
    const res = (await http().delete(`/api/v1/teams/${team2}/day-helpers/${lending.lendingId}`).set(owner).expect(200)).body.data as Team;
    expect(res.borrowed).toEqual([]);
    await http().delete(`/api/v1/teams/${team2}/day-helpers/${lending.lendingId}`).set(owner).expect(404);

    const ch = await changes(helper, c0);
    expect(ids(ch.jobs)).toEqual([j1Today]);
    expect(ch.removed).toEqual([j2Today]);
    expect(ids((await bootstrap()).jobs)).toEqual([j1Today, j1Tomorrow].sort());
    // Kept as history, marked undone.
    expect(await prisma.teamDayHelper.count({ where: { organizationId: a.organizationId, removedAt: { not: null } } })).toBe(1);
  });

  it('a lending planned for tomorrow changes tomorrow only; past lendings cannot be undone', async () => {
    const c0 = (await bootstrap()).cursor;
    await lend(team2, { memberId: helperId, day: tomorrow }).expect(201);
    const ch = await changes(helper, c0);
    expect(ids(ch.jobs)).toEqual([j2Tomorrow]);
    expect(ch.removed).toEqual([j1Tomorrow]);
    expect(ids((await bootstrap()).jobs)).toEqual([j1Today, j2Tomorrow].sort());

    const past = await prisma.teamDayHelper.create({
      data: {
        organizationId: a.organizationId,
        teamId: team3,
        organizationMemberId: helper2Id,
        day: new Date(`${plusDays(today, -2)}T00:00:00.000Z`),
        createdByMemberId: a.memberIds.OWNER,
      },
    });
    expect((await http().delete(`/api/v1/teams/${team3}/day-helpers/${past.id}`).set(owner).expect(400)).body.error.code).toBe('DAY_IN_PAST');
  });
});
