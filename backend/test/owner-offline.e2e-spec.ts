import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000057';
const PREFIX_B = '90000058';

describe('Owner saves offline (e2e, D-021)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  let teamId: string;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const op = (operation: string, entityType: string, entityId: string, payload: object, dependsOn?: string) => ({
    id: randomUUID(),
    operation,
    entityType,
    entityId,
    payload,
    dependsOn: dependsOn ?? null,
    createdAt: new Date().toISOString(),
  });
  const send = (token: string, ...ops: object[]) =>
    http().post('/api/v1/sync/operations').set(as(token)).send({ operations: ops }).expect(200);
  const statuses = (res: request.Response) => res.body.data.results.map((r: { status: string; code?: string }) => r.code ?? r.status);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Offline A', PREFIX_A);
    b = await factory.create('Offline B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    teamId = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
    // Already saved online with the same mobile number.
    await http().post('/api/v1/customers').set(owner).send({ name: 'Meera', phone: '9822077777', site: { addressLine1: 'Flat 1' } }).expect(201);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('customer, AC, enquiry and job saved offline arrive in order with the phone ids', async () => {
    const [customerId, siteId, acId, enquiryId, jobId] = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const c = op('customer.create', 'Customer', customerId, { name: 'Meera J', phone: '98220 77777', siteId, site: { addressLine1: 'Shop 4', locality: 'Kothrud' } });
    const ac = op('equipment.create', 'Equipment', acId, { customerId, siteId, type: 'SPLIT', locationLabel: 'Shop' }, c.id);
    const e = op('enquiry.create', 'ServiceRequest', enquiryId, { customerId, siteId, source: 'PHONE', complaint: 'Noise' }, c.id);
    const j = op('job.create', 'ServiceJob', jobId, { customerId, siteId, equipmentIds: [acId], teamId, scheduledDate: '2026-11-23' }, ac.id);
    const res = await send(a.tokens.OWNER, c, ac, e, j);
    expect(statuses(res)).toEqual(['applied', 'applied', 'applied', 'applied']);

    const owner = as(a.tokens.OWNER);
    const customer = (await http().get(`/api/v1/customers/${customerId}`).set(owner).expect(200)).body.data;
    // Same number as Meera: kept as a second customer, not refused (merging comes later).
    expect(customer).toMatchObject({ name: 'Meera J', phone: '+919822077777', sites: [{ id: siteId, equipment: [{ id: acId }] }] });
    const job = (await http().get(`/api/v1/jobs/${jobId}`).set(owner).expect(200)).body.data;
    expect(job).toMatchObject({ status: 'ASSIGNED', jobNumber: expect.any(Number) });
    await http().get(`/api/v1/enquiries/${enquiryId}`).set(owner).expect(200);
    // The senior's phone gets the job like any other.
    const mine = (await http().get('/api/v1/my/jobs').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(200)).body.data;
    expect(mine.map((x: { id: string }) => x.id)).toContain(jobId);

    // Sent again after a lost reply: nothing is made twice.
    expect(statuses(await send(a.tokens.OWNER, c, ac, e, j))).toEqual(['duplicate', 'duplicate', 'duplicate', 'duplicate']);
  });

  it('a refused customer takes the job saved after it down too', async () => {
    const [customerId, siteId, jobId] = [randomUUID(), randomUUID(), randomUUID()];
    const c = op('customer.create', 'Customer', customerId, { name: '', phone: '123', siteId, site: { addressLine1: 'X' } });
    const j = op('job.create', 'ServiceJob', jobId, { customerId, siteId }, c.id);
    expect(statuses(await send(a.tokens.OWNER, c, j))).toEqual(['VALIDATION_FAILED', 'DEPENDENCY_FAILED']);
    const wrongType = op('job.create', 'Customer', randomUUID(), { customerId, siteId });
    expect(statuses(await send(a.tokens.OWNER, wrongType))).toEqual(['VALIDATION_FAILED']);
  });

  it('staff cannot create, and another business cannot use these ids', async () => {
    const [customerId, siteId] = [randomUUID(), randomUUID()];
    const c = op('customer.create', 'Customer', customerId, { name: 'Ravi', phone: '9822088888', siteId, site: { addressLine1: 'Flat 2' } });
    expect(statuses(await send(a.tokens.SENIOR_TECHNICIAN, c))).toEqual(['FORBIDDEN_ROLE']);
    expect(statuses(await send(a.tokens.OWNER, { ...c, id: randomUUID() }))).toEqual(['applied']);
    const j = op('job.create', 'ServiceJob', randomUUID(), { customerId, siteId });
    expect(statuses(await send(b.tokens.OWNER, j))).toEqual(['SITE_NOT_FOUND']);
  });
});
