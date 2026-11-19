import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { CapturingOtpSender, OtpSender } from '../src/auth/otp-sender.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Synthetic test numbers (docs/12 §3). Cleaned up before and after.
const PHONE = '+919000000001';
const PHONE_LIMIT = '+919000000002';
const PHONE_WRONG = '+919000000003';
const PHONE_ROTATE = '+919000000004';
const PHONE_LOGOUT = '+919000000005';
const ALL = [PHONE, PHONE_LIMIT, PHONE_WRONG, PHONE_ROTATE, PHONE_LOGOUT];
const DEVICE = { platform: 'android', label: 'Test phone' };

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const otp = new CapturingOtpSender();
  const http = () => request(app.getHttpServer());

  async function cleanUp() {
    await prisma.otpChallenge.deleteMany({ where: { phone: { in: ALL } } });
    const users = await prisma.user.findMany({ where: { phone: { in: ALL } } });
    const ids = users.map((u) => u.id);
    await prisma.refreshToken.deleteMany({
      where: { device: { userId: { in: ids } } },
    });
    await prisma.device.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  async function login(phone: string) {
    await http().post('/api/v1/auth/request-otp').send({ phone }).expect(202);
    const res = await http()
      .post('/api/v1/auth/verify-otp')
      .send({ phone, code: otp.sent.get(phone), device: DEVICE })
      .expect(200);
    return res.body.data as { accessToken: string; refreshToken: string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OtpSender)
      .useValue(otp)
      .compile();
    app = configureApp(
      moduleRef.createNestApplication(),
    ) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    await cleanUp();
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('logs in a new user with phone + OTP and returns tokens', async () => {
    await http()
      .post('/api/v1/auth/request-otp')
      .send({ phone: '90000 00001' })
      .expect(202);
    const code = otp.sent.get(PHONE);
    expect(code).toMatch(/^\d{6}$/);

    const res = await http()
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '9000000001', code, device: DEVICE })
      .expect(200);
    expect(res.body.data.user.phone).toBe(PHONE);
    expect(res.body.data.membership).toBeNull();
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();

    const challenge = await prisma.otpChallenge.findFirst({
      where: { phone: PHONE },
    });
    expect(challenge?.codeHash).not.toContain(code);
  });

  it('protects routes by default and accepts a valid access token', async () => {
    await http().get('/api/v1/auth/me').expect(401);
    const { accessToken } = await login(PHONE);
    const me = await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.user.phone).toBe(PHONE);
  });

  it('does not accept the same code twice', async () => {
    await http()
      .post('/api/v1/auth/request-otp')
      .send({ phone: PHONE })
      .expect(202);
    const code = otp.sent.get(PHONE);
    const body = { phone: PHONE, code, device: DEVICE };
    await http().post('/api/v1/auth/verify-otp').send(body).expect(200);
    const again = await http()
      .post('/api/v1/auth/verify-otp')
      .send(body)
      .expect(400);
    expect(again.body.error.code).toBe('OTP_EXPIRED');
  });

  it('rotates refresh tokens and signs the device out when one is reused', async () => {
    const first = await login(PHONE_ROTATE);
    const second = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(200);

    const reuse = await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: first.refreshToken })
      .expect(401);
    expect(reuse.body.error.code).toBe('REFRESH_REUSED');

    // The whole device is now signed out, including the newer tokens.
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second.body.data.refreshToken })
      .expect(401);
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${second.body.data.accessToken}`)
      .expect(401);
  });

  it('logout ends the session', async () => {
    const s = await login(PHONE_LOGOUT);
    await http()
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${s.accessToken}`)
      .expect(200);
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${s.accessToken}`)
      .expect(401);
    await http()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: s.refreshToken })
      .expect(401);
  });

  it('locks a code after 5 wrong attempts', async () => {
    await http()
      .post('/api/v1/auth/request-otp')
      .send({ phone: PHONE_WRONG })
      .expect(202);
    const right = otp.sent.get(PHONE_WRONG) as string;
    const wrong = right === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      const r = await http()
        .post('/api/v1/auth/verify-otp')
        .send({ phone: PHONE_WRONG, code: wrong, device: DEVICE })
        .expect(400);
      expect(r.body.error.code).toBe('OTP_INVALID');
    }
    const locked = await http()
      .post('/api/v1/auth/verify-otp')
      .send({ phone: PHONE_WRONG, code: right, device: DEVICE })
      .expect(429);
    expect(locked.body.error.code).toBe('OTP_TOO_MANY_ATTEMPTS');
  });

  it('limits codes to 3 per number per 15 minutes', async () => {
    for (let i = 0; i < 3; i++) {
      await http()
        .post('/api/v1/auth/request-otp')
        .send({ phone: PHONE_LIMIT })
        .expect(202);
    }
    const res = await http()
      .post('/api/v1/auth/request-otp')
      .send({ phone: PHONE_LIMIT })
      .expect(429);
    expect(res.body.error.code).toBe('OTP_SEND_LIMIT');
  });

  it('rejects invalid phone numbers and garbage tokens', async () => {
    const bad = await http()
      .post('/api/v1/auth/request-otp')
      .send({ phone: '12345' })
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_FAILED');
    await http()
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
  });
});
