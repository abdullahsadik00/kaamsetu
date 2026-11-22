import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000055';
const PREFIX_B = '90000056';

describe('Rate list (e2e, T4.10, D-039)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let gasId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Rates A', PREFIX_A);
    b = await factory.create('Rates B', PREFIX_B);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('adds items and lists them by name; a second item with the same name is refused', async () => {
    const owner = as(a.tokens.OWNER);
    gasId = (await http().post('/api/v1/rate-items').set(owner).send({ name: 'Gas filling', unitPrice: 250000, gstRate: 18 }).expect(201)).body.data.id;
    const service = (await http().post('/api/v1/rate-items').set(owner).send({ name: 'AC service', unitPrice: 50000 }).expect(201)).body.data;
    expect(service).toMatchObject({ name: 'AC service', unitPrice: 50000, gstRate: 0, active: true });
    const dup = await http().post('/api/v1/rate-items').set(owner).send({ name: ' gas FILLING ', unitPrice: 1 }).expect(409);
    expect(dup.body.error).toMatchObject({ code: 'RATE_NAME_EXISTS', details: { rateId: gasId } });
    await http().post('/api/v1/rate-items').set(owner).send({ name: 'Odd GST', unitPrice: 1, gstRate: 7 }).expect(400);
    const list = (await http().get('/api/v1/rate-items').set(owner).expect(200)).body.data;
    expect(list.map((r: { name: string }) => r.name)).toEqual(['AC service', 'Gas filling']);
  });

  it('edits the price; turned off it leaves the picker but stays under all', async () => {
    const owner = as(a.tokens.OWNER);
    const edited = (await http().patch(`/api/v1/rate-items/${gasId}`).set(owner).send({ unitPrice: 270000 }).expect(200)).body.data;
    expect(edited).toMatchObject({ unitPrice: 270000, gstRate: 18 });
    await http().patch(`/api/v1/rate-items/${gasId}`).set(owner).send({ active: false }).expect(200);
    const picker = (await http().get('/api/v1/rate-items').set(owner).expect(200)).body.data;
    expect(picker.map((r: { name: string }) => r.name)).toEqual(['AC service']);
    const all = (await http().get('/api/v1/rate-items?all=true').set(owner).expect(200)).body.data;
    expect(all.map((r: { name: string; active: boolean }) => [r.name, r.active])).toEqual([['AC service', true], ['Gas filling', false]]);
    // The name is free again once the old one is off.
    await http().post('/api/v1/rate-items').set(owner).send({ name: 'Gas filling', unitPrice: 300000 }).expect(201);
  });

  it('keeps other businesses and staff out', async () => {
    expect((await http().get('/api/v1/rate-items').set(as(b.tokens.OWNER)).expect(200)).body.data).toEqual([]);
    await http().patch(`/api/v1/rate-items/${gasId}`).set(as(b.tokens.OWNER)).send({ unitPrice: 1 }).expect(404);
    await http().get('/api/v1/rate-items').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().post('/api/v1/rate-items').set(as(a.tokens.HELPER)).send({ name: 'X', unitPrice: 1 }).expect(403);
  });
});
