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

/** Test stand-in for Google: "test-google:<sub>" is a valid ID token for that account. */
class FakeGoogleVerifier extends GoogleVerifier {
  async verify(idToken: string): Promise<GoogleIdentity> {
    const m = idToken.match(/^test-google:(test-g-[\w-]+)$/);
    if (!m) throw new AppError(401, 'GOOGLE_TOKEN_INVALID', 'bad token');
    return {
      subject: m[1],
      email: `${m[1]}@example.test`,
      name: 'Google Name',
    };
  }
}

const DEVICE = { platform: 'android', label: 'Test phone' };
const PREFIX_A = '90000051';
const PREFIX_B = '90000052';

describe('Google login + owner invites (e2e, D-025)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  type Session = {
    accessToken: string;
    refreshToken: string;
    membership: { role: string; memberId: string } | null;
  };

  async function google(sub: string): Promise<Session> {
    const res = await http()
      .post('/api/v1/auth/google')
      .send({ idToken: `test-google:${sub}`, device: DEVICE })
      .expect(200);
    return res.body.data as Session;
  }

  async function invite(owner: string, memberId: string) {
    const res = await http()
      .post(`/api/v1/employees/${memberId}/invite`)
      .set(bearer(owner))
      .expect(201);
    const data = res.body.data as {
      qr: string;
      code: string;
      expiresAt: string;
    };
    return { ...data, token: new URL(data.qr).searchParams.get('t') as string };
  }

  async function removeGoogleUsers() {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { googleSubject: { startsWith: 'test-g-' } },
          // Only this file's users: e2e files run in parallel on one database.
          { email: { startsWith: 'test-g-' } },
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
    await removeGoogleUsers();
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Invite Test A', PREFIX_A);
    b = await factory.create('Invite Test B', PREFIX_B);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await removeGoogleUsers();
    await app.close();
  });

  it('a new Google account gets a session without a business', async () => {
    const s = await google('test-g-new');
    expect(s.membership).toBeNull();
    expect(s.refreshToken).toBeTruthy();
    // Business routes stay closed until an invite is accepted.
    await http()
      .get('/api/v1/organization')
      .set(bearer(s.accessToken))
      .expect(403);
  });

  it('rejects a bad Google token', async () => {
    await http()
      .post('/api/v1/auth/google')
      .send({ idToken: 'not-a-real-google-token', device: DEVICE })
      .expect(401);
  });

  it('links a Google account to the invited employee by QR token', async () => {
    const tech = await google('test-g-senior');
    const inv = await invite(a.tokens.OWNER, a.memberIds.SENIOR_TECHNICIAN);
    expect(inv.code).toMatch(/^\d{6}$/);
    expect(inv.qr).toMatch(/^kaamsetu:\/\/join\?t=/);

    const res = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(tech.accessToken))
      .send({ token: inv.token })
      .expect(200);
    const linked = res.body.data as Session;
    expect(linked.membership).toMatchObject({
      role: 'SENIOR_TECHNICIAN',
      memberId: a.memberIds.SENIOR_TECHNICIAN,
    });
    // The temporary Google-only session is ended.
    await http()
      .get('/api/v1/auth/me')
      .set(bearer(tech.accessToken))
      .expect(401);
    // Next Google login goes straight to the employee record.
    const again = await google('test-g-senior');
    expect(again.membership?.role).toBe('SENIOR_TECHNICIAN');
    // The same invite cannot be used twice.
    const other = await google('test-g-reuse');
    const reuse = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(other.accessToken))
      .send({ token: inv.token })
      .expect(400);
    expect(reuse.body.error.code).toBe('INVITE_INVALID');
  });

  it('shows the owner which employees have a linked login, without Google ids', async () => {
    const res = await http()
      .get('/api/v1/employees')
      .set(bearer(a.tokens.OWNER))
      .expect(200);
    const rows = res.body.data as {
      id: string;
      loginLinked: boolean;
      user: object;
    }[];
    const senior = rows.find((r) => r.id === a.memberIds.SENIOR_TECHNICIAN);
    expect(senior?.loginLinked).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('test-g-');
  });

  it('refuses to link an employee who already uses another Google account', async () => {
    const inv = await invite(a.tokens.OWNER, a.memberIds.SENIOR_TECHNICIAN);
    const intruder = await google('test-g-intruder');
    const res = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(intruder.accessToken))
      .send({ token: inv.token })
      .expect(409);
    expect(res.body.error.code).toBe('EMPLOYEE_ALREADY_LINKED');
  });

  it('accepts phone + 6-digit code, and locks the invite after 5 wrong codes', async () => {
    const helperPhone = `+91${PREFIX_A}03`;
    const user = await google('test-g-helper');
    let inv = await invite(a.tokens.OWNER, a.memberIds.HELPER);
    const wrong = inv.code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await http()
        .post('/api/v1/auth/accept-invite')
        .set(bearer(user.accessToken))
        .send({ phone: helperPhone, code: wrong })
        .expect(400);
      expect(r.body.error.code).toBe('INVITE_CODE_WRONG');
    }
    const locked = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(user.accessToken))
      .send({ phone: helperPhone, code: inv.code })
      .expect(400);
    expect(locked.body.error.code).toBe('INVITE_TOO_MANY_ATTEMPTS');

    inv = await invite(a.tokens.OWNER, a.memberIds.HELPER); // owner makes a new one
    const ok = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(user.accessToken))
      .send({ phone: helperPhone, code: inv.code })
      .expect(200);
    expect((ok.body.data as Session).membership?.role).toBe('HELPER');
  });

  it('says when the typed mobile number has no invite (T3.13)', async () => {
    await invite(a.tokens.OWNER, a.memberIds.HELPER);
    const user = await google('test-g-typo');
    const res = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(user.accessToken))
      .send({ phone: `+91${PREFIX_A}09`, code: '123456' }) // nobody has this number
      .expect(400);
    expect(res.body.error.code).toBe('INVITE_NOT_FOR_THIS_PHONE');
  });

  it('rejects an expired invite', async () => {
    const inv = await invite(b.tokens.OWNER, b.memberIds.HELPER);
    await prisma.memberInvite.updateMany({
      where: { memberId: b.memberIds.HELPER, usedAt: null, revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const user = await google('test-g-late');
    const res = await http()
      .post('/api/v1/auth/accept-invite')
      .set(bearer(user.accessToken))
      .send({ token: inv.token })
      .expect(400);
    expect(res.body.error.code).toBe('INVITE_EXPIRED');
  });

  it('only the owner of the same business can invite or reset', async () => {
    await http()
      .post(`/api/v1/employees/${a.memberIds.HELPER}/invite`)
      .set(bearer(b.tokens.OWNER))
      .expect(404);
    await http()
      .post(`/api/v1/employees/${a.memberIds.HELPER}/invite`)
      .set(bearer(a.tokens.SENIOR_TECHNICIAN))
      .expect(403);
    await http()
      .post(`/api/v1/employees/${a.memberIds.HELPER}/reset-login`)
      .set(bearer(b.tokens.OWNER))
      .expect(404);
  });

  it('reset-login unlinks the Google account and signs out the phones', async () => {
    const before = await google('test-g-senior');
    expect(before.membership?.role).toBe('SENIOR_TECHNICIAN');
    await http()
      .post(`/api/v1/employees/${a.memberIds.SENIOR_TECHNICIAN}/reset-login`)
      .set(bearer(a.tokens.OWNER))
      .expect(200);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: before.refreshToken })
      .expect(401);
    const after = await google('test-g-senior');
    expect(after.membership).toBeNull();
  });

  it('the owner cannot reset their own login', async () => {
    const res = await http()
      .post(`/api/v1/employees/${a.memberIds.OWNER}/reset-login`)
      .set(bearer(a.tokens.OWNER))
      .expect(400);
    expect(res.body.error.code).toBe('CANNOT_RESET_SELF');
  });
});
