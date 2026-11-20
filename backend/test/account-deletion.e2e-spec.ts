import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { AppError } from '../src/common/app-error.js';
import {
  GoogleVerifier,
  type GoogleIdentity,
} from '../src/auth/google-verifier.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

class FakeGoogleVerifier extends GoogleVerifier {
  async verify(idToken: string): Promise<GoogleIdentity> {
    const m = idToken.match(/^test-google:(test-d-[\w-]+)$/);
    if (!m) throw new AppError(401, 'GOOGLE_TOKEN_INVALID', 'bad token');
    return {
      subject: m[1],
      email: `${m[1]}@example.test`,
      name: 'Google Name',
    };
  }
}

const DEVICE = { platform: 'android' };
const PREFIX_A = '90000081';
const PREFIX_B = '90000082';

describe('Delete my account (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const del = (token: string, body: object = { confirm: true }) =>
    http().post('/api/v1/auth/delete-account').set(bearer(token)).send(body);

  async function removeGoogleUsers() {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { googleSubject: { startsWith: 'test-d-' } },
          { email: { startsWith: 'test-d-' } },
        ],
      },
    });
    const ids = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({
      where: { device: { userId: { in: ids } } },
    });
    await prisma.device.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({
      where: { id: { in: ids }, memberships: { none: {} } },
    });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GoogleVerifier)
      .useValue(new FakeGoogleVerifier())
      .compile();
    app = configureApp(
      moduleRef.createNestApplication(),
    ) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    await removeGoogleUsers();
    a = await factory.create('Deletion A', PREFIX_A);
    b = await factory.create('Deletion B', PREFIX_B);
  });

  afterAll(async () => {
    // Deleted users lost their phone numbers, so remove them by id too.
    const orgIds = [a.organizationId, b.organizationId];
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: { in: orgIds } },
      select: { userId: true },
    });
    await factory.cleanUp();
    const ids = members.map((m) => m.userId);
    await prisma.refreshToken.deleteMany({
      where: { device: { userId: { in: ids } } },
    });
    await prisma.device.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await removeGoogleUsers();
    await app.close();
  });

  it('needs an explicit confirmation', async () => {
    const res = await del(a.tokens.HELPER, {}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('a staff member: personal details wiped, signed out, business keeps running', async () => {
    const res = await del(a.tokens.HELPER).expect(200);
    expect(res.body.data).toEqual({ deleted: true, businessClosed: false });

    await http()
      .get('/api/v1/auth/me')
      .set(bearer(a.tokens.HELPER))
      .expect(401);
    const member = await prisma.organizationMember.findUniqueOrThrow({
      where: { id: a.memberIds.HELPER },
      include: { user: true },
    });
    expect(member.status).toBe('INACTIVE');
    expect(member.user).toMatchObject({
      name: 'Deleted user',
      phone: null,
      email: null,
      googleSubject: null,
      status: 'INACTIVE',
    });
    // The owner and others are unaffected.
    await http()
      .get('/api/v1/organization')
      .set(bearer(a.tokens.OWNER))
      .expect(200);
    await http()
      .get('/api/v1/organization')
      .set(bearer(a.tokens.SENIOR_TECHNICIAN))
      .expect(200);
  });

  it('an owner: the business is closed and everyone in it is signed out', async () => {
    const res = await del(b.tokens.OWNER).expect(200);
    expect(res.body.data).toEqual({ deleted: true, businessClosed: true });

    for (const role of ['OWNER', 'SENIOR_TECHNICIAN', 'HELPER'] as const) {
      await http()
        .get('/api/v1/auth/me')
        .set(bearer(b.tokens[role]))
        .expect(401);
    }
    const org = await prisma.organization.findUniqueOrThrow({
      where: { id: b.organizationId },
    });
    expect(org.status).toBe('INACTIVE');
    const active = await prisma.organizationMember.count({
      where: { organizationId: b.organizationId, status: 'ACTIVE' },
    });
    expect(active).toBe(0);
    // Business A is untouched.
    await http()
      .get('/api/v1/organization')
      .set(bearer(a.tokens.OWNER))
      .expect(200);
  });

  it('signing in again with the same Google account starts fresh', async () => {
    const first = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: 'test-google:test-d-person', device: DEVICE })
      .expect(200);
    await del(first.body.data.accessToken).expect(200);
    const again = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: 'test-google:test-d-person', device: DEVICE })
      .expect(200);
    expect(again.body.data.membership).toBeNull();
    expect(again.body.data.user.id).not.toBe(first.body.data.user.id);
  });
});
