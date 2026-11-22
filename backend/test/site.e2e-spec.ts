import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX = '90000070';

describe('Public pages for Google publishing (e2e)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    process.env.SUPPORT_EMAIL = 'support@example.test';
    process.env.GOOGLE_SITE_VERIFICATION = 'test-verify-<code>';
    process.env.SUPPORT_WHATSAPP = '98220 70001';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Support A', PREFIX);
  });

  afterAll(async () => {
    delete process.env.SUPPORT_EMAIL;
    delete process.env.GOOGLE_SITE_VERIFICATION;
    delete process.env.SUPPORT_WHATSAPP;
    await factory.cleanUp();
    await app.close();
  });

  it.each([
    ['/', 'Simple jobs and billing'],
    ['/privacy', 'Privacy policy'],
    ['/terms', 'Terms of use'],
    ['/delete-account', 'Delete your KaamSetu account'],
  ])('serves %s as HTML without signing in', async (path, heading) => {
    const res = await http().get(path).expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain(heading);
    expect(res.text).toContain('mailto:support@example.test');
    expect(res.text).not.toContain('"data"'); // not wrapped in the JSON envelope
  });

  it('puts the escaped Google verification tag on the homepage only', async () => {
    const home = await http().get('/').expect(200);
    expect(home.text).toContain(
      '<meta name="google-site-verification" content="test-verify-&#60;code&#62;">',
    );
    const privacy = await http().get('/privacy').expect(200);
    expect(privacy.text).not.toContain('google-site-verification');
  });

  it('gives every signed-in role the help contacts from the settings (T7.3)', async () => {
    await http().get('/api/v1/support').expect(401);
    for (const role of ['OWNER', 'SENIOR_TECHNICIAN', 'HELPER'] as const) {
      const res = await http().get('/api/v1/support').set('Authorization', `Bearer ${a.tokens[role]}`).expect(200);
      expect(res.body.data).toEqual({ whatsapp: '+919822070001', email: 'support@example.test' });
    }
  });

  it('keeps the API under /api/v1', async () => {
    await http().get('/api/v1/organization').expect(401);
    await http().get('/organization').expect(404);
  });
});
