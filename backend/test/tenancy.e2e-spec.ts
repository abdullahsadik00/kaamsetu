import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000011';
const PREFIX_B = '90000012';
const LONER_PHONE = '+919000001399';

describe('Roles and tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let tenants: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  let loner: string;
  const get = (path: string, token: string) =>
    request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(
      moduleRef.createNestApplication(),
    ) as INestApplication<App>;
    await app.init();
    tenants = new TenantFactory(app);
    await tenants.removeLeftovers([PREFIX_A, PREFIX_B, '90000013']);
    a = await tenants.create('Cool Care (test A)', PREFIX_A);
    b = await tenants.create('Arctic Air (test B)', PREFIX_B);
    loner = await tenants.userWithoutBusiness(LONER_PHONE);
  });

  afterAll(async () => {
    await tenants.cleanUp();
    await app.close();
  });

  describe('roles', () => {
    it('lets the owner list employees of their own business only', async () => {
      const res = await get('/api/v1/employees', a.tokens.OWNER).expect(200);
      const ids = (res.body.data as { id: string }[]).map((m) => m.id).sort();
      expect(ids).toEqual(Object.values(a.memberIds).sort());
    });

    it.each(['SENIOR_TECHNICIAN', 'HELPER'] as const)(
      'refuses the employee list to a %s',
      async (role) => {
        const res = await get('/api/v1/employees', a.tokens[role]).expect(403);
        expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
      },
    );

    it('lets every member see their own business details', async () => {
      for (const token of Object.values(a.tokens)) {
        const res = await get('/api/v1/organization', token).expect(200);
        expect(res.body.data.id).toBe(a.organizationId);
      }
    });

    it('asks a user without a business to set one up first', async () => {
      const res = await get('/api/v1/organization', loner).expect(403);
      expect(res.body.error.code).toBe('NO_ORGANIZATION');
    });
  });

  describe('isolation between businesses', () => {
    it("returns 404 (not 403) for another business's employee", async () => {
      const res = await get(
        `/api/v1/employees/${b.memberIds.OWNER}`,
        a.tokens.OWNER,
      ).expect(404);
      expect(res.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
    });

    it('gives the same 404 for an ID that does not exist at all', async () => {
      const res = await get(
        '/api/v1/employees/00000000-0000-4000-8000-000000000000',
        a.tokens.OWNER,
      ).expect(404);
      expect(res.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
    });

    it('still finds its own employee by ID', async () => {
      const res = await get(
        `/api/v1/employees/${a.memberIds.HELPER}`,
        a.tokens.OWNER,
      ).expect(200);
      expect(res.body.data.role).toBe('HELPER');
    });

    it('ignores an organizationId smuggled into the query string', async () => {
      const res = await get(
        `/api/v1/employees?organizationId=${b.organizationId}`,
        a.tokens.OWNER,
      ).expect(200);
      const ids = (res.body.data as { id: string }[]).map((m) => m.id);
      expect(ids).not.toContain(b.memberIds.OWNER);
    });
  });

  describe('membership changes take effect immediately', () => {
    it('rejects the token of a member who was deactivated', async () => {
      const prisma = app.get(PrismaService);
      await prisma.organizationMember.update({
        where: { id: b.memberIds.HELPER },
        data: { status: 'INACTIVE', deactivatedAt: new Date() },
      });
      const res = await get('/api/v1/organization', b.tokens.HELPER).expect(
        401,
      );
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });
  });
});
