import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000091';
const PREFIX_B = '90000092';

describe('Customers, addresses and ACs (e2e, T4.3/T4.4)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });

  const meera = {
    name: 'Meera Joshi',
    phone: '98220 45001',
    site: { label: 'Home', addressLine1: 'Flat 12, Sai Heights', locality: 'Kothrud', city: 'Pune' },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Customers A', PREFIX_A);
    b = await factory.create('Customers B', PREFIX_B);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  let meeraId: string;
  let homeSiteId: string;

  it('adds a customer with the first address as the default site', async () => {
    const res = await http().post('/api/v1/customers').set(as(a.tokens.OWNER)).send(meera).expect(201);
    const c = res.body.data;
    expect(c).toMatchObject({ name: 'Meera Joshi', phone: '+919822045001', type: 'INDIVIDUAL' });
    expect(c.sites).toHaveLength(1);
    expect(c.sites[0]).toMatchObject({ isDefault: true, locality: 'Kothrud', equipment: [] });
    expect(c).not.toHaveProperty('organizationId');
    meeraId = c.id;
    homeSiteId = c.sites[0].id;
  });

  it('warns about a mobile already saved in this business, allows "Add anyway"', async () => {
    const dup = await http()
      .post('/api/v1/customers')
      .set(as(a.tokens.OWNER))
      .send({ ...meera, name: 'Meera J' })
      .expect(409);
    expect(dup.body.error).toMatchObject({
      code: 'CUSTOMER_PHONE_EXISTS',
      details: { customerId: meeraId, name: 'Meera Joshi' },
    });
    await http()
      .post('/api/v1/customers')
      .set(as(a.tokens.OWNER))
      .send({ ...meera, name: 'Meera office', allowDuplicatePhone: true })
      .expect(201);
    // Another business may have the same customer number.
    await http().post('/api/v1/customers').set(as(b.tokens.OWNER)).send(meera).expect(201);
  });

  it('finds customers by last 4 digits or part of the name, only in this business', async () => {
    const byDigits = await http().get('/api/v1/customers?q=5001').set(as(a.tokens.OWNER)).expect(200);
    expect(byDigits.body.data.map((c: { name: string }) => c.name).sort()).toEqual([
      'Meera Joshi',
      'Meera office',
    ]);
    expect(byDigits.body.data[0]).toHaveProperty('place', 'Kothrud');
    const byName = await http().get('/api/v1/customers?q=jOSh').set(as(a.tokens.OWNER)).expect(200);
    expect(byName.body.data).toHaveLength(1);
    const none = await http().get('/api/v1/customers?q=zzz').set(as(a.tokens.OWNER)).expect(200);
    expect(none.body.data).toEqual([]);
  });

  it('adds another address and ACs; an AC must use one of the customer’s addresses', async () => {
    const withOffice = await http()
      .post(`/api/v1/customers/${meeraId}/sites`)
      .set(as(a.tokens.OWNER))
      .send({ label: 'Office', addressLine1: '2nd floor, Pride Icon', locality: 'Baner' })
      .expect(201);
    expect(withOffice.body.data.sites).toHaveLength(2);

    const ac = await http()
      .post('/api/v1/equipment')
      .set(as(a.tokens.OWNER))
      .send({ customerId: meeraId, siteId: homeSiteId, type: 'SPLIT', brand: 'Voltas', capacityTons: 1.5, locationLabel: 'Bedroom 1' })
      .expect(201);
    expect(ac.body.data).toMatchObject({ brand: 'Voltas', capacityTons: 1.5, status: 'ACTIVE' });

    const otherCustomer = await http()
      .get('/api/v1/customers?q=office')
      .set(as(a.tokens.OWNER))
      .expect(200);
    await http()
      .post('/api/v1/equipment')
      .set(as(a.tokens.OWNER))
      .send({ customerId: otherCustomer.body.data[0].id, siteId: homeSiteId, type: 'WINDOW' })
      .expect(404);

    const list = await http().get('/api/v1/customers?q=Joshi').set(as(a.tokens.OWNER)).expect(200);
    expect(list.body.data[0].acCount).toBe(1);

    const archived = await http()
      .patch(`/api/v1/equipment/${ac.body.data.id}`)
      .set(as(a.tokens.OWNER))
      .send({ archived: true })
      .expect(200);
    expect(archived.body.data.status).toBe('ARCHIVED');
  });

  it('edits and archives a customer; archived ones are found only on request', async () => {
    await http()
      .patch(`/api/v1/customers/${meeraId}`)
      .set(as(a.tokens.OWNER))
      .send({ notes: 'Call after 6 pm', archived: true })
      .expect(200);
    const active = await http().get('/api/v1/customers?q=Joshi').set(as(a.tokens.OWNER)).expect(200);
    expect(active.body.data).toEqual([]);
    const old = await http()
      .get('/api/v1/customers?q=Joshi&archived=true')
      .set(as(a.tokens.OWNER))
      .expect(200);
    expect(old.body.data).toHaveLength(1);
  });

  it('keeps businesses apart and technicians out', async () => {
    await http().get(`/api/v1/customers/${meeraId}`).set(as(b.tokens.OWNER)).expect(404);
    await http()
      .patch(`/api/v1/customers/${meeraId}`)
      .set(as(b.tokens.OWNER))
      .send({ name: 'Hijack' })
      .expect(404);
    await http()
      .post('/api/v1/equipment')
      .set(as(b.tokens.OWNER))
      .send({ customerId: meeraId, siteId: homeSiteId, type: 'SPLIT' })
      .expect(404);
    await http().get('/api/v1/customers').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().get('/api/v1/customers').set(as(a.tokens.HELPER)).expect(403);
  });

  it('validates input', async () => {
    const res = await http()
      .post('/api/v1/customers')
      .set(as(a.tokens.OWNER))
      .send({ name: 'X', phone: '123', site: { addressLine1: '' } })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
