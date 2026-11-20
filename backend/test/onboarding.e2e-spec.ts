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

/** "test-google:<sub>" is a valid Google ID token for that account. */
class FakeGoogleVerifier extends GoogleVerifier {
  async verify(idToken: string): Promise<GoogleIdentity> {
    const m = idToken.match(/^test-google:(test-o-[\w-]+)$/);
    if (!m) throw new AppError(401, 'GOOGLE_TOKEN_INVALID', 'bad token');
    return { subject: m[1], email: `${m[1]}@example.test`, name: 'Google Name' };
  }
}

const DEVICE = { platform: 'android', label: 'Test phone' };
const PREFIX_NEW = '90000071'; // businesses created through the API
const PREFIX_B = '90000072'; // an existing other business

describe('Business onboarding and adding staff (e2e, T4.1 / D-027)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let factory: TenantFactory;
  let other: TestTenant;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  type Session = {
    accessToken: string;
    refreshToken: string;
    membership: { role: string; organizationId: string } | null;
  };

  async function google(sub: string): Promise<Session> {
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: `test-google:${sub}`, device: DEVICE })
      .expect(200);
    return res.body.data as Session;
  }

  const refresh = async (s: Session) =>
    (
      await http()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: s.refreshToken })
        .expect(200)
    ).body.data as Session;

  const business = {
    name: 'Test Cool Air',
    ownerName: 'Test Owner',
    phone: `${PREFIX_NEW}01`,
    city: 'Pune',
    gstBills: true,
    gstin: '27abcde1234f1z5',
  };

  async function removeTestUsers() {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { googleSubject: { startsWith: 'test-o-' } },
          { email: { startsWith: 'test-o-' } },
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
    await factory.removeLeftovers([PREFIX_NEW, PREFIX_B]);
    await removeTestUsers();
    other = await factory.create('Onboarding Other', PREFIX_B);
  });

  afterAll(async () => {
    await factory.removeLeftovers([PREFIX_NEW, PREFIX_B]);
    await removeTestUsers();
    await app.close();
  });

  let owner: Session;

  it('a Google user without a business creates one, with a 30-day trial', async () => {
    const s = await google('test-o-owner');
    expect(s.membership).toBeNull();

    const res = await http()
      .post('/api/v1/organizations')
      .set(bearer(s.accessToken))
      .send(business)
      .expect(201);
    expect(res.body.data).toMatchObject({
      name: 'Test Cool Air',
      phone: `+91${PREFIX_NEW}01`,
      gstBills: true,
      gstin: '27ABCDE1234F1Z5',
    });
    const days =
      (new Date(res.body.data.trialEndsAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThan(30.1);

    // The refreshed token carries the new owner role.
    owner = await refresh(s);
    expect(owner.membership?.role).toBe('OWNER');
    const org = await http()
      .get('/api/v1/organization')
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(org.body.data.name).toBe('Test Cool Air');

    const sub = await prisma.subscription.findUnique({
      where: { organizationId: res.body.data.id },
    });
    expect(sub?.status).toBe('TRIALING');
    const user = await prisma.user.findFirst({
      where: { googleSubject: 'test-o-owner' },
    });
    expect(user).toMatchObject({ name: 'Test Owner', phone: `+91${PREFIX_NEW}01` });
  });

  it('refuses a second business for the same person', async () => {
    const again = await google('test-o-owner');
    const res = await http()
      .post('/api/v1/organizations')
      .set(bearer(again.accessToken))
      .send({ ...business, phone: `${PREFIX_NEW}02` })
      .expect(409);
    expect(res.body.error.code).toBe('ALREADY_IN_BUSINESS');
  });

  it('validates the business form', async () => {
    const s = await google('test-o-invalid');
    const res = await http()
      .post('/api/v1/organizations')
      .set(bearer(s.accessToken))
      .send({ ...business, name: ' ', gstin: '12345', phone: '12345' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('the owner adds staff, who then join with an invite', async () => {
    const add = await http()
      .post('/api/v1/employees')
      .set(bearer(owner.accessToken))
      .send({ name: 'New Senior', phone: `${PREFIX_NEW}11`, role: 'SENIOR_TECHNICIAN' })
      .expect(201);
    expect(add.body.data).toMatchObject({
      role: 'SENIOR_TECHNICIAN',
      loginLinked: false,
      user: { name: 'New Senior', phone: `+91${PREFIX_NEW}11` },
    });

    const inv = await http()
      .post(`/api/v1/employees/${add.body.data.id}/invite`)
      .set(bearer(owner.accessToken))
      .expect(201);
    const tech = await google('test-o-senior');
    const joined = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(tech.accessToken))
      .send({ phone: `${PREFIX_NEW}11`, code: inv.body.data.code })
      .expect(200);
    expect(joined.body.data.membership.role).toBe('SENIOR_TECHNICIAN');
  });

  it('refuses duplicates, numbers from other businesses, and non-owners', async () => {
    const dup = await http()
      .post('/api/v1/employees')
      .set(bearer(owner.accessToken))
      .send({ name: 'Again', phone: `${PREFIX_NEW}11`, role: 'HELPER' })
      .expect(409);
    expect(dup.body.error.code).toBe('EMPLOYEE_EXISTS');

    const taken = await http()
      .post('/api/v1/employees')
      .set(bearer(owner.accessToken))
      .send({ name: 'Poach', phone: `${PREFIX_B}03`, role: 'HELPER' })
      .expect(409);
    expect(taken.body.error.code).toBe('PHONE_IN_OTHER_BUSINESS');

    await http()
      .post('/api/v1/employees')
      .set(bearer(other.tokens.SENIOR_TECHNICIAN))
      .send({ name: 'Nope', phone: `${PREFIX_NEW}12`, role: 'HELPER' })
      .expect(403);
  });
});
