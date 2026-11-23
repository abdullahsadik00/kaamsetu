import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000093';
const PREFIX_B = '90000094';

type Team = {
  id: string;
  name: string;
  active: boolean;
  members: { memberId: string; position: string; isPrimary: boolean }[];
};

describe('Teams (e2e, T4.2)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  let senior2: string;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Teams A', PREFIX_A);
    b = await factory.create('Teams B', PREFIX_B);
    const add = await http()
      .post('/api/v1/employees')
      .set(as(a.tokens.OWNER))
      .send({ name: 'Second Senior', phone: `${PREFIX_A}04`, role: 'SENIOR_TECHNICIAN' })
      .expect(201);
    senior2 = add.body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  let team: Team;

  it('creates a team with a primary senior and a helper', async () => {
    const res = await http()
      .post('/api/v1/teams')
      .set(as(a.tokens.OWNER))
      .send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN, helperMemberIds: [a.memberIds.HELPER] })
      .expect(201);
    team = res.body.data;
    expect(team.members).toEqual([
      expect.objectContaining({ memberId: a.memberIds.SENIOR_TECHNICIAN, position: 'SENIOR_TECHNICIAN', isPrimary: true }),
      expect.objectContaining({ memberId: a.memberIds.HELPER, position: 'HELPER', isPrimary: false }),
    ]);
  });

  it('keeps one primary senior: a new primary demotes the old one', async () => {
    const res = await http()
      .post(`/api/v1/teams/${team.id}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: senior2, primary: true })
      .expect(201);
    const primaries = (res.body.data as Team).members.filter((m) => m.isPrimary);
    expect(primaries).toEqual([expect.objectContaining({ memberId: senior2 })]);

    const dup = await http()
      .post(`/api/v1/teams/${team.id}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: senior2 })
      .expect(409);
    expect(dup.body.error.code).toBe('ALREADY_IN_TEAM');
  });

  it('when the primary senior leaves, the other senior becomes primary', async () => {
    const res = await http()
      .delete(`/api/v1/teams/${team.id}/members/${senior2}`)
      .set(as(a.tokens.OWNER))
      .expect(200);
    const members = (res.body.data as Team).members;
    expect(members.find((m) => m.memberId === senior2)).toBeUndefined();
    expect(members.find((m) => m.isPrimary)?.memberId).toBe(a.memberIds.SENIOR_TECHNICIAN);
  });

  // The owner may join a team (D-043): see owner-field.e2e-spec.
  it('refuses other businesses’ staff and removed employees', async () => {
    await http()
      .post(`/api/v1/teams/${team.id}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: b.memberIds.HELPER })
      .expect(404);
    await http().post(`/api/v1/employees/${senior2}/deactivate`).set(as(a.tokens.OWNER)).expect(200);
    const gone = await http()
      .post(`/api/v1/teams/${team.id}/members`)
      .set(as(a.tokens.OWNER))
      .send({ memberId: senior2 })
      .expect(400);
    expect(gone.body.error.code).toBe('EMPLOYEE_NOT_ACTIVE');
  });

  it('removing an employee from the business takes them out of their teams', async () => {
    await http()
      .post(`/api/v1/employees/${a.memberIds.HELPER}/deactivate`)
      .set(as(a.tokens.OWNER))
      .expect(200);
    const res = await http().get(`/api/v1/teams/${team.id}`).set(as(a.tokens.OWNER)).expect(200);
    expect((res.body.data as Team).members.map((m) => m.memberId)).toEqual([a.memberIds.SENIOR_TECHNICIAN]);
  });

  it('renames and deactivates; keeps businesses apart and technicians out', async () => {
    const res = await http()
      .patch(`/api/v1/teams/${team.id}`)
      .set(as(a.tokens.OWNER))
      .send({ name: 'Team Kothrud', active: false })
      .expect(200);
    expect(res.body.data).toMatchObject({ name: 'Team Kothrud', active: false });
    await http().get(`/api/v1/teams/${team.id}`).set(as(b.tokens.OWNER)).expect(404);
    const list = await http().get('/api/v1/teams').set(as(b.tokens.OWNER)).expect(200);
    expect(list.body.data).toEqual([]);
    await http().get('/api/v1/teams').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
  });
});
