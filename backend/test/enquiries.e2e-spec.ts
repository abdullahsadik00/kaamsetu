import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000063';
const PREFIX_B = '90000064';

describe('Enquiries (e2e, T4.5)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  let customerId: string;
  let siteId: string;
  let ac1: string;
  let ac2: string;
  let otherSiteAc: string;
  let team1: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Enquiries A', PREFIX_A);
    b = await factory.create('Enquiries B', PREFIX_B);
    const owner = as(a.tokens.OWNER);
    const c = await http()
      .post('/api/v1/customers')
      .set(owner)
      .send({ name: 'Fatima S', phone: '9545098712', site: { addressLine1: 'A-602', locality: 'NIBM Road' } })
      .expect(201);
    customerId = c.body.data.id;
    siteId = c.body.data.sites[0].id;
    const withOffice = await http()
      .post(`/api/v1/customers/${customerId}/sites`)
      .set(owner)
      .send({ addressLine1: 'Shop 3', locality: 'Kondhwa' })
      .expect(201);
    const officeId = withOffice.body.data.sites.find((s: { id: string }) => s.id !== siteId).id;
    const ac = async (site: string) =>
      (await http().post('/api/v1/equipment').set(owner).send({ customerId, siteId: site, type: 'SPLIT' }).expect(201)).body.data.id as string;
    ac1 = await ac(siteId);
    ac2 = await ac(siteId);
    otherSiteAc = await ac(officeId);
    team1 = (await http().post('/api/v1/teams').set(owner).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  let enquiryId: string;

  it('saves an enquiry with the first number and lists it as open', async () => {
    const res = await http()
      .post('/api/v1/enquiries')
      .set(as(a.tokens.OWNER))
      .send({
        customerId,
        siteId,
        equipmentIds: [ac1, ac2],
        source: 'PHONE',
        type: 'REPAIR',
        complaint: 'Hall AC makes noise at night',
        preferredDate: '2026-12-01',
        preferredSlot: 'EVENING',
      })
      .expect(201);
    enquiryId = res.body.data.id;
    expect(res.body.data).toMatchObject({
      number: 201,
      status: 'OPEN',
      source: 'PHONE',
      type: 'REPAIR',
      customerName: 'Fatima S',
      place: 'NIBM Road',
      acCount: 2,
      preferredDate: '2026-12-01',
      preferredSlot: 'EVENING',
      job: null,
    });
    const open = await http().get('/api/v1/enquiries?status=OPEN').set(as(a.tokens.OWNER)).expect(200);
    expect(open.body.data.map((e: { id: string }) => e.id)).toContain(enquiryId);
  });

  it('refuses an AC from another address', async () => {
    const res = await http()
      .post('/api/v1/enquiries')
      .set(as(a.tokens.OWNER))
      .send({ customerId, siteId, equipmentIds: [otherSiteAc] })
      .expect(400);
    expect(res.body.error.code).toBe('EQUIPMENT_NOT_AT_SITE');
  });

  it('edits an open enquiry and refuses a stale version', async () => {
    const res = await http()
      .patch(`/api/v1/enquiries/${enquiryId}`)
      .set(as(a.tokens.OWNER))
      .send({ version: 1, source: 'WHATSAPP' })
      .expect(200);
    expect(res.body.data).toMatchObject({ source: 'WHATSAPP', version: 2 });
    const stale = await http()
      .patch(`/api/v1/enquiries/${enquiryId}`)
      .set(as(a.tokens.OWNER))
      .send({ version: 1, complaint: 'x' })
      .expect(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('is hidden from technicians, helpers and other businesses', async () => {
    await http().get('/api/v1/enquiries').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().get('/api/v1/enquiries').set(as(a.tokens.HELPER)).expect(403);
    await http().get(`/api/v1/enquiries/${enquiryId}`).set(as(b.tokens.OWNER)).expect(404);
    await http().post(`/api/v1/enquiries/${enquiryId}/convert`).set(as(b.tokens.OWNER)).send({}).expect(404);
    const listB = await http().get('/api/v1/enquiries').set(as(b.tokens.OWNER)).expect(200);
    expect(listB.body.data).toEqual([]);
  });

  it('converts to a job that copies everything and links back', async () => {
    const res = await http()
      .post(`/api/v1/enquiries/${enquiryId}/convert`)
      .set(as(a.tokens.OWNER))
      .send({ teamId: team1, amountToCollect: 150000 })
      .expect(201);
    const job = res.body.data;
    expect(job).toMatchObject({
      customerId,
      type: 'REPAIR',
      complaint: 'Hall AC makes noise at night',
      scheduledDate: '2026-12-01',
      timeSlot: 'EVENING',
      status: 'ASSIGNED',
      teamId: team1,
      amountToCollect: 150000,
      acCount: 2,
      enquiry: { id: enquiryId, number: 201 },
    });
    expect(job.site.id).toBe(siteId);
    const e = await http().get(`/api/v1/enquiries/${enquiryId}`).set(as(a.tokens.OWNER)).expect(200);
    expect(e.body.data).toMatchObject({ status: 'CONVERTED', job: { id: job.id, number: job.jobNumber } });
    const closed = await http().get('/api/v1/enquiries?status=CLOSED').set(as(a.tokens.OWNER)).expect(200);
    expect(closed.body.data.map((x: { id: string }) => x.id)).toContain(enquiryId);
  });

  it('refuses to convert, edit or close a converted enquiry', async () => {
    const again = await http().post(`/api/v1/enquiries/${enquiryId}/convert`).set(as(a.tokens.OWNER)).send({}).expect(409);
    expect(again.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    await http().patch(`/api/v1/enquiries/${enquiryId}`).set(as(a.tokens.OWNER)).send({ version: 3, complaint: 'x' }).expect(409);
    await http().post(`/api/v1/enquiries/${enquiryId}/close`).set(as(a.tokens.OWNER)).send({ reason: 'Too late' }).expect(409);
  });

  it('two converts at once make one job', async () => {
    const e = await http().post('/api/v1/enquiries').set(as(a.tokens.OWNER)).send({ customerId, siteId }).expect(201);
    const results = await Promise.all(
      [1, 2].map(() => http().post(`/api/v1/enquiries/${e.body.data.id}/convert`).set(as(a.tokens.OWNER)).send({})),
    );
    expect(results.map((r) => r.status).sort((x, y) => x - y)).toEqual([201, 409]);
  });

  it('converting can clear the day and leaves out ACs removed since', async () => {
    const e = await http()
      .post('/api/v1/enquiries')
      .set(as(a.tokens.OWNER))
      .send({ customerId, siteId, equipmentIds: [ac1, ac2], preferredDate: '2026-12-02', preferredSlot: 'MORNING' })
      .expect(201);
    await http().patch(`/api/v1/equipment/${ac2}`).set(as(a.tokens.OWNER)).send({ archived: true }).expect(200);
    const job = await http()
      .post(`/api/v1/enquiries/${e.body.data.id}/convert`)
      .set(as(a.tokens.OWNER))
      .send({ scheduledDate: null })
      .expect(201);
    expect(job.body.data).toMatchObject({ scheduledDate: null, timeSlot: null, status: 'NEW' });
    expect(job.body.data.equipment.map((x: { id: string }) => x.id)).toEqual([ac1]);
  });

  it('closes an open enquiry only with a reason', async () => {
    const e = await http().post('/api/v1/enquiries').set(as(a.tokens.OWNER)).send({ customerId, siteId }).expect(201);
    await http().post(`/api/v1/enquiries/${e.body.data.id}/close`).set(as(a.tokens.OWNER)).send({ reason: '' }).expect(400);
    const res = await http()
      .post(`/api/v1/enquiries/${e.body.data.id}/close`)
      .set(as(a.tokens.OWNER))
      .send({ reason: 'Customer found someone else' })
      .expect(200);
    expect(res.body.data).toMatchObject({ status: 'CLOSED', closeReason: 'Customer found someone else' });
  });

  it('numbers stay unique when many are saved at once', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => http().post('/api/v1/enquiries').set(as(a.tokens.OWNER)).send({ customerId, siteId })),
    );
    const numbers = results.map((r) => r.body.data.number as number);
    expect(new Set(numbers).size).toBe(10);
  });
});
