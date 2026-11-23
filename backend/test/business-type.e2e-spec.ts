import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TokenService } from '../src/auth/token.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_V = '90000083'; // a vendor made by the factory (owner, senior, helper)
const PREFIX_S = '90000084'; // a solo business signed up through the API
const PREFIX_C = '90000085'; // a crew signed up through the API

/** Business type decides which screens and routes a business has (D-044). */
describe('Business type (e2e, D-044)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let factory: TenantFactory;
  let v: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });

  /** Signs a new user up as the owner of a business of this type; returns a token with the membership. */
  async function signUp(prefix: string, businessType: string) {
    const token = await factory.userWithoutBusiness(`+91${prefix}01`);
    await http()
      .post('/api/v1/organizations')
      .set(as(token))
      .send({ name: `Type ${businessType}`, ownerName: 'Test Owner', phone: `${prefix}02`, businessType })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { phone: `+91${prefix}01` } });
    return (await app.get(TokenService).loginNewDevice(user.id, { platform: 'android' })).accessToken;
  }
  const customerAndSite = async (token: string, phone: string) =>
    (await http().post('/api/v1/customers').set(as(token)).send({ name: 'Asha', phone, site: { addressLine1: 'Flat 2' } }).expect(201)).body.data;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_V, PREFIX_S, PREFIX_C]);
    v = await factory.create('Type Vendor', PREFIX_V);
  });

  afterAll(async () => {
    // The API-made businesses first: their owners are the factory's users.
    await factory.removeLeftovers([PREFIX_S, PREFIX_C]);
    await factory.cleanUp();
    await app.close();
  });

  describe('solo', () => {
    let solo: string;
    beforeAll(async () => {
      solo = await signUp(PREFIX_S, 'SOLO');
    });

    it('signs up with its own team, the owner as senior, and no team or staff screens', async () => {
      const org = (await http().get('/api/v1/organization').set(as(solo)).expect(200)).body.data;
      expect(org).toMatchObject({ businessType: 'SOLO', features: [], inTeam: true });
    });

    it('is refused the teams, employees and staff updates routes', async () => {
      for (const path of ['/api/v1/teams', '/api/v1/employees', '/api/v1/updates']) {
        const res = await http().get(path).set(as(solo)).expect(403);
        expect(res.body.error.code).toBe('NOT_IN_BUSINESS_TYPE');
      }
    });

    it('a new job goes to the owner’s team and shows on My work', async () => {
      const c = await customerAndSite(solo, `${PREFIX_S}11`);
      const job = (await http().post('/api/v1/jobs').set(as(solo)).send({ customerId: c.id, siteId: c.sites[0].id }).expect(201)).body.data;
      expect(job.status).toBe('ASSIGNED');
      const mine = (await http().get('/api/v1/my/jobs').set(as(solo)).expect(200)).body.data;
      expect(mine.map((j: { id: string }) => j.id)).toEqual([job.id]);
    });

    it('moves up to crew and then gets employees', async () => {
      const res = await http().post('/api/v1/organization/business-type').set(as(solo)).send({ businessType: 'CREW' }).expect(200);
      expect(res.body.data).toEqual({ businessType: 'CREW', features: ['EMPLOYEES'] });
      await http().get('/api/v1/employees').set(as(solo)).expect(200);
    });
  });

  describe('crew', () => {
    let crew: string;
    beforeAll(async () => {
      crew = await signUp(PREFIX_C, 'CREW');
    });

    it('adds one employee into the owner’s team, and refuses a second', async () => {
      const helper = (await http().post('/api/v1/employees').set(as(crew)).send({ name: 'Test Helper', phone: `${PREFIX_C}21`, role: 'HELPER' }).expect(201)).body.data;
      const teamRows = await prisma.teamMember.findMany({ where: { organizationMemberId: helper.id, leftAt: null } });
      expect(teamRows).toHaveLength(1);
      expect(teamRows[0].position).toBe('HELPER');
      const second = await http().post('/api/v1/employees').set(as(crew)).send({ name: 'Test Two', phone: `${PREFIX_C}22`, role: 'HELPER' }).expect(409);
      expect(second.body.error.code).toBe('EMPLOYEE_LIMIT');
    });

    it('cannot go down to solo while it has an employee', async () => {
      const res = await http().post('/api/v1/organization/business-type').set(as(crew)).send({ businessType: 'SOLO' }).expect(409);
      expect(res.body.error.code).toBe('TOO_MANY_EMPLOYEES');
    });

    it('moves up to vendor and gets teams, keeping its team', async () => {
      await http().post('/api/v1/organization/business-type').set(as(crew)).send({ businessType: 'VENDOR' }).expect(200);
      const teams = (await http().get('/api/v1/teams').set(as(crew)).expect(200)).body.data;
      expect(teams).toHaveLength(1);
    });
  });

  describe('vendor', () => {
    it('keeps every screen and has no own team', async () => {
      const org = (await http().get('/api/v1/organization').set(as(v.tokens.OWNER)).expect(200)).body.data;
      expect(org).toMatchObject({ businessType: 'VENDOR', features: ['TEAMS', 'EMPLOYEES', 'STAFF_UPDATES'], inTeam: false });
      await http().get('/api/v1/teams').set(as(v.tokens.OWNER)).expect(200);
    });

    it('cannot go down to crew with two employees', async () => {
      const res = await http().post('/api/v1/organization/business-type').set(as(v.tokens.OWNER)).send({ businessType: 'CREW' }).expect(409);
      expect(res.body.error.code).toBe('TOO_MANY_EMPLOYEES');
    });

    it('cannot go down while another team has open jobs; can once they are moved', async () => {
      const owner = as(v.tokens.OWNER);
      await http().post(`/api/v1/employees/${v.memberIds.HELPER}/deactivate`).set(owner).expect(200);
      const team = (await http().post('/api/v1/teams').set(owner).send({ name: 'Staff', seniorMemberId: v.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
      const c = await customerAndSite(v.tokens.OWNER, `${PREFIX_V}31`);
      const job = (await http().post('/api/v1/jobs').set(owner).send({ customerId: c.id, siteId: c.sites[0].id, teamId: team }).expect(201)).body.data.id;

      const blocked = await http().post('/api/v1/organization/business-type').set(owner).send({ businessType: 'CREW' }).expect(409);
      expect(blocked.body.error.code).toBe('OPEN_JOBS_ON_OTHER_TEAMS');

      await http().post(`/api/v1/jobs/${job}/cancel`).set(owner).send({ reason: 'Test' }).expect(200);
      await http().post('/api/v1/organization/business-type').set(owner).send({ businessType: 'CREW' }).expect(200);
      expect((await prisma.team.findUniqueOrThrow({ where: { id: team } })).active).toBe(false);
      const org = (await http().get('/api/v1/organization').set(owner).expect(200)).body.data;
      expect(org).toMatchObject({ businessType: 'CREW', inTeam: true });
      // The senior who stayed is in the owner's team now.
      const rows = await prisma.teamMember.findMany({ where: { organizationMemberId: v.memberIds.SENIOR_TECHNICIAN, leftAt: null, team: { active: true } } });
      expect(rows).toHaveLength(1);
      const audit = await prisma.auditLog.findFirst({ where: { organizationId: v.organizationId, action: 'BUSINESS_TYPE_CHANGED' } });
      expect(audit?.metadata).toEqual({ from: 'VENDOR', to: 'CREW' });
    });
  });
});
