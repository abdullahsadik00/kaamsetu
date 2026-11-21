import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000099';
const PREFIX_B = '90000089';

describe('Billing: bills, quotations, payments (e2e, T4.10/T4.11)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });
  const owner = () => as(a.tokens.OWNER);
  let customerId: string;
  let gstCustomerId: string;
  let siteId: string;
  let teamId: string;
  let doneJob: string;
  let openJob: string;

  const op = (operation: string, entityId: string, payload: object = {}) => ({
    id: randomUUID(),
    operation,
    entityType: 'ServiceJob',
    entityId,
    payload,
    createdAt: new Date().toISOString(),
  });
  /** A job for the customer, started and finished by the team's senior. */
  const finishedJob = async (finish: object, amountToCollect?: number) => {
    const job = (
      await http()
        .post('/api/v1/jobs')
        .set(owner())
        .send({ customerId, siteId, teamId, type: 'REPAIR', ...(amountToCollect ? { amountToCollect } : {}) })
        .expect(201)
    ).body.data.id as string;
    await http()
      .post('/api/v1/sync/operations')
      .set(as(a.tokens.SENIOR_TECHNICIAN))
      .send({ operations: [op('job.start', job), op('job.complete', job, finish)] })
      .expect(200);
    return job;
  };
  const bill = (body: object) => http().post('/api/v1/bills').set(owner()).send(body);
  const pay = (id: string, body: object) =>
    http().post(`/api/v1/bills/${id}/payments`).set(owner()).send({ mode: 'CASH', idempotencyKey: randomUUID(), ...body });
  const issued = async (items: object[], extra: object = {}) => {
    const created = await bill({ customerId, items, ...extra }).expect(201);
    return (await http().post(`/api/v1/bills/${created.body.data.id}/issue`).set(owner()).expect(200)).body.data;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Billing A', PREFIX_A);
    b = await factory.create('Billing B', PREFIX_B);
    await http().patch('/api/v1/organization').set(owner()).send({ gstBills: true, gstin: '27ABCDE1234F1Z5' }).expect(200);
    const c = (
      await http()
        .post('/api/v1/customers')
        .set(owner())
        .send({ name: 'Anil Deshpande', phone: '9822012345', site: { addressLine1: 'Flat 4', locality: 'Kothrud' } })
        .expect(201)
    ).body.data;
    customerId = c.id;
    siteId = c.sites[0].id;
    gstCustomerId = (
      await http()
        .post('/api/v1/customers')
        .set(owner())
        .send({ name: 'Hotel Annapurna', phone: '9822054321', type: 'BUSINESS', gstBills: true, gstin: '27AACHA4410K1Z3', site: { addressLine1: 'FC Road' } })
        .expect(201)
    ).body.data.id;
    teamId = (
      await http().post('/api/v1/teams').set(owner()).send({ name: 'Team 1', seniorMemberId: a.memberIds.SENIOR_TECHNICIAN }).expect(201)
    ).body.data.id;
    doneJob = await finishedJob(
      { outcome: 'COMPLETED', parts: [{ name: 'Gas top-up R32', qty: 1 }, { name: 'Drain pipe', qty: 2 }], collected: { amount: 100000, mode: 'CASH' } },
      50000,
    );
    openJob = (await http().post('/api/v1/jobs').set(owner()).send({ customerId, siteId }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  describe('bills', () => {
    it('prefills from a completed job: the service at the amount to collect, then the parts', async () => {
      const res = await http().get(`/api/v1/bills/prefill?jobId=${doneJob}`).set(owner()).expect(200);
      expect(res.body.data).toMatchObject({
        jobId: doneJob,
        customer: { id: customerId, name: 'Anil Deshpande' },
        siteId,
        gstBill: false,
        existingBillId: null,
        items: [
          { source: 'SERVICE', description: 'AC repair visit', qty: 1, unitPrice: 50000, gstRate: 0 },
          { source: 'PART', description: 'Gas top-up R32', qty: 1, unitPrice: 0 },
          { source: 'PART', description: 'Drain pipe', qty: 2, unitPrice: 0 },
        ],
        collections: [{ amount: 100000, mode: 'CASH', status: 'WITH_TEAM' }],
      });
    });

    it('refuses a bill for a job that is not finished', async () => {
      const res = await bill({ jobId: openJob }).expect(409);
      expect(res.body.error.code).toBe('JOB_NOT_COMPLETED');
    });

    it('works out the totals itself; totals sent by the phone are refused', async () => {
      const res = await bill({
        customerId,
        items: [
          { description: 'Installation, split AC', qty: 2, unitPrice: 180000 },
          { description: 'Copper pipe', qty: 6, unitPrice: 45000 },
        ],
        discount: 20000,
      }).expect(201);
      expect(res.body.data).toMatchObject({
        status: 'DRAFT',
        payState: null,
        subtotal: 630000,
        discount: 20000,
        taxTotal: 0,
        total: 610000,
        gstBill: false,
      });
      expect(res.body.data.number).toMatch(/^KS-\d{4}$/);
      expect(res.body.data.items.map((i: { amount: number }) => i.amount)).toEqual([360000, 270000]);
      const sneaky = await bill({ customerId, items: [{ description: 'x', qty: 1, unitPrice: 100 }], total: 1 }).expect(400);
      expect(sneaky.body.error.code).toBe('VALIDATION_FAILED');
      const sneakyLine = await bill({ customerId, items: [{ description: 'x', qty: 1, unitPrice: 100, amount: 5 }] }).expect(400);
      expect(sneakyLine.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('GST bill: discount first, then CGST + SGST per line, with both GSTINs', async () => {
      const res = await bill({
        customerId: gstCustomerId,
        items: [
          { description: 'Installation, split AC', qty: 2, unitPrice: 180000, gstRate: 18 },
          { description: 'Copper pipe', qty: 6, unitPrice: 45000, gstRate: 18 },
        ],
        discount: 20000,
      }).expect(201);
      // Discount shares 11429 + 8571; CGST = SGST = 9 % of 348571 (31371) + 9 % of 261429 (23529).
      expect(res.body.data).toMatchObject({
        gstBill: true,
        subtotal: 630000,
        taxTotal: 109800,
        total: 719800,
        gst: [{ rate: 18, taxable: 610000, cgst: 54900, sgst: 54900 }],
        sellerGstin: '27ABCDE1234F1Z5',
        buyerGstin: '27AACHA4410K1Z3',
      });
      const off = await http()
        .patch(`/api/v1/bills/${res.body.data.id}`)
        .set(owner())
        .send({ version: res.body.data.version, gstBill: false })
        .expect(200);
      expect(off.body.data).toMatchObject({ taxTotal: 0, total: 610000, gst: [] });
    });

    it('refuses a discount bigger than the items', async () => {
      const res = await bill({ customerId, items: [{ description: 'Visit', qty: 1, unitPrice: 50000 }], discount: 50001 }).expect(400);
      expect(res.body.error.code).toBe('DISCOUNT_TOO_BIG');
    });

    it('edits a draft, refuses a stale version, then an issued bill cannot change', async () => {
      const draft = (await bill({ customerId, items: [{ description: 'Visit', qty: 1, unitPrice: 50000 }] }).expect(201)).body.data;
      const edited = await http()
        .patch(`/api/v1/bills/${draft.id}`)
        .set(owner())
        .send({ version: 1, items: [{ description: 'Visit', qty: 1, unitPrice: 60000 }, { description: 'Capacitor', qty: 1, unitPrice: 45000 }] })
        .expect(200);
      expect(edited.body.data).toMatchObject({ version: 2, total: 105000 });
      const stale = await http().patch(`/api/v1/bills/${draft.id}`).set(owner()).send({ version: 1, discount: 100 }).expect(409);
      expect(stale.body.error.code).toBe('VERSION_CONFLICT');
      const done = await http().post(`/api/v1/bills/${draft.id}/issue`).set(owner()).expect(200);
      expect(done.body.data).toMatchObject({ status: 'ISSUED', payState: 'NOT_PAID', remaining: 105000 });
      const locked = await http().patch(`/api/v1/bills/${draft.id}`).set(owner()).send({ version: 3, discount: 100 }).expect(409);
      expect(locked.body.error.code).toBe('BILL_ISSUED');
      await http().post(`/api/v1/bills/${draft.id}/issue`).set(owner()).expect(409);
      const again = await http().get(`/api/v1/bills/${draft.id}`).set(owner()).expect(200);
      expect(again.body.data.total).toBe(105000);
    });

    it('numbers stay unique when ten bills are saved at once', async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () => bill({ customerId, items: [{ description: 'Visit', qty: 1, unitPrice: 100 }] })),
      );
      expect(results.map((r) => r.status)).toEqual(Array(10).fill(201));
      expect(new Set(results.map((r) => r.body.data.number)).size).toBe(10);
    });
  });

  describe('payments', () => {
    let billId: string;

    it('partial, then over-pay refused, then the rest: Not paid → Partly paid → Paid', async () => {
      billId = (await issued([{ description: 'Installation', qty: 1, unitPrice: 610000 }])).id;
      const draft = (await bill({ customerId, items: [{ description: 'x', qty: 1, unitPrice: 100 }] }).expect(201)).body.data;
      expect((await pay(draft.id, { amount: 100 }).expect(409)).body.error.code).toBe('BILL_NOT_ISSUED');

      const first = await pay(billId, { amount: 300000, receivedAt: '2026-11-12', note: 'Advance' }).expect(201);
      expect(first.body.data).toMatchObject({ amount: 300000, mode: 'CASH', receivedAt: '2026-11-12', voidedAt: null });
      let b1 = (await http().get(`/api/v1/bills/${billId}`).set(owner()).expect(200)).body.data;
      expect(b1).toMatchObject({ payState: 'PARTLY_PAID', paid: 300000, remaining: 310000 });

      const over = await pay(billId, { amount: 310001, mode: 'UPI' }).expect(409);
      expect(over.body.error).toMatchObject({ code: 'OVERPAY', details: { remaining: 310000 } });

      await pay(billId, { amount: 310000, mode: 'UPI' }).expect(201);
      b1 = (await http().get(`/api/v1/bills/${billId}`).set(owner()).expect(200)).body.data;
      expect(b1).toMatchObject({ payState: 'PAID', paid: 610000, remaining: 0 });
      expect(b1.payments).toHaveLength(2);

      const paidList = await http().get('/api/v1/bills?filter=PAID').set(owner()).expect(200);
      expect(paidList.body.data.map((x: { id: string }) => x.id)).toContain(billId);
      const toCollect = await http().get('/api/v1/bills').set(owner()).expect(200);
      expect(toCollect.body.data.map((x: { id: string }) => x.id)).not.toContain(billId);
    });

    it('takes more than what is left only when asked to', async () => {
      const id = (await issued([{ description: 'Service', qty: 1, unitPrice: 50000 }])).id;
      await pay(id, { amount: 60000, allowOverpay: true }).expect(201);
      const res = await http().get(`/api/v1/bills/${id}`).set(owner()).expect(200);
      expect(res.body.data).toMatchObject({ payState: 'PAID', paid: 60000, remaining: 0 });
    });

    it('the same payment sent twice (or at once) is saved once', async () => {
      const id = (await issued([{ description: 'Service', qty: 1, unitPrice: 80000 }])).id;
      const key = randomUUID();
      const one = await pay(id, { amount: 80000, idempotencyKey: key }).expect(201);
      const two = await pay(id, { amount: 80000, idempotencyKey: key }).expect(201);
      expect(two.body.data.id).toBe(one.body.data.id);
      const reused = await pay(id, { amount: 100, idempotencyKey: key }).expect(409);
      expect(reused.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');

      const id2 = (await issued([{ description: 'Service', qty: 1, unitPrice: 80000 }])).id;
      const key2 = randomUUID();
      const both = await Promise.all([1, 2, 3].map(() => pay(id2, { amount: 80000, idempotencyKey: key2 })));
      expect(both.map((r) => r.status)).toEqual([201, 201, 201]);
      expect(new Set(both.map((r) => r.body.data.id)).size).toBe(1);
      const res = await http().get(`/api/v1/bills/${id2}`).set(owner()).expect(200);
      expect(res.body.data).toMatchObject({ paid: 80000, payments: [{ amount: 80000 }] });
    });

    it('voiding keeps the payment with its reason and puts the amount back', async () => {
      const id = (await issued([{ description: 'Service', qty: 1, unitPrice: 90000 }])).id;
      const p = (await pay(id, { amount: 40000 }).expect(201)).body.data;
      await http().post(`/api/v1/payments/${p.id}/void`).set(owner()).send({ reason: '' }).expect(400);
      const res = await http().post(`/api/v1/payments/${p.id}/void`).set(owner()).send({ reason: 'Entered twice' }).expect(200);
      expect(res.body.data).toMatchObject({ id: p.id, amount: 40000, voidReason: 'Entered twice' });
      expect(res.body.data.voidedAt).toBeTruthy();
      await http().post(`/api/v1/payments/${p.id}/void`).set(owner()).send({ reason: 'Again' }).expect(409);
      const b1 = (await http().get(`/api/v1/bills/${id}`).set(owner()).expect(200)).body.data;
      expect(b1).toMatchObject({ paid: 0, payState: 'NOT_PAID', remaining: 90000 });
      expect(b1.payments).toHaveLength(1);
    });

    it('cancelling keeps the bill (with its payments) and the job can be billed again', async () => {
      const created = (await bill({ jobId: doneJob }).expect(201)).body.data;
      expect(created).toMatchObject({ customerId, jobId: doneJob, total: 50000, collections: [{ status: 'WITH_TEAM' }] });
      const twice = await bill({ jobId: doneJob }).expect(409);
      expect(twice.body.error).toMatchObject({ code: 'JOB_ALREADY_BILLED', details: { billId: created.id } });
      await http().post(`/api/v1/bills/${created.id}/cancel`).set(owner()).send({ reason: 'x' }).expect(400);
      const cancelled = await http().post(`/api/v1/bills/${created.id}/cancel`).set(owner()).send({ reason: 'Wrong price' }).expect(200);
      expect(cancelled.body.data).toMatchObject({ status: 'CANCELLED', cancelReason: 'Wrong price', total: 50000 });
      const all = await http().get('/api/v1/bills?filter=ALL').set(owner()).expect(200);
      expect(all.body.data.map((x: { id: string }) => x.id)).toContain(created.id);
      await http().post(`/api/v1/bills/${created.id}/cancel`).set(owner()).send({ reason: 'Again' }).expect(409);
      const again = await bill({ jobId: doneJob }).expect(201);
      expect(again.body.data.id).not.toBe(created.id);
    });
  });

  describe('cash with teams (D-008)', () => {
    it('confirming cash records it on the job’s bill; rejecting keeps the reason', async () => {
      const list = await http().get('/api/v1/cash-collections').set(owner()).expect(200);
      const cash = list.body.data.find((c: { jobId: string }) => c.jobId === doneJob);
      expect(cash).toMatchObject({ amount: 100000, mode: 'CASH', status: 'WITH_TEAM', customerName: 'Anil Deshpande' });

      // The job's live bill (made in the test above) is a draft: issue it at ₹1,500.
      const live = (await http().get(`/api/v1/bills/prefill?jobId=${doneJob}`).set(owner()).expect(200)).body.data.existingBillId;
      const draft = (await http().get(`/api/v1/bills/${live}`).set(owner()).expect(200)).body.data;
      await http()
        .patch(`/api/v1/bills/${live}`)
        .set(owner())
        .send({ version: draft.version, items: [{ description: 'AC repair visit', qty: 1, unitPrice: 150000 }] })
        .expect(200);
      await http().post(`/api/v1/bills/${live}/issue`).set(owner()).expect(200);

      const confirmed = await http().post(`/api/v1/cash-collections/${cash.id}/confirm`).set(owner()).send({}).expect(200);
      expect(confirmed.body.data.status).toBe('CONFIRMED');
      expect(confirmed.body.data.paymentId).toBeTruthy();
      const b1 = (await http().get(`/api/v1/bills/${live}`).set(owner()).expect(200)).body.data;
      expect(b1).toMatchObject({ paid: 100000, remaining: 50000, payState: 'PARTLY_PAID', payments: [{ amount: 100000, fromTeam: true }] });
      await http().post(`/api/v1/cash-collections/${cash.id}/confirm`).set(owner()).send({}).expect(409);

      const job2 = await finishedJob({ outcome: 'COMPLETED', collected: { amount: 70000, mode: 'UPI' } });
      const cash2 = (await http().get('/api/v1/cash-collections').set(owner()).expect(200)).body.data.find(
        (c: { jobId: string }) => c.jobId === job2,
      );
      const rejected = await http()
        .post(`/api/v1/cash-collections/${cash2.id}/reject`)
        .set(owner())
        .send({ reason: 'Not received in UPI' })
        .expect(200);
      expect(rejected.body.data).toMatchObject({ status: 'REJECTED', rejectReason: 'Not received in UPI', paymentId: null });
    });

    it('cash confirmed before the bill is added when the bill is issued', async () => {
      const job = await finishedJob({ outcome: 'COMPLETED', collected: { amount: 20000, mode: 'CASH' } }, 20000);
      const cash = (await http().get('/api/v1/cash-collections').set(owner()).expect(200)).body.data.find(
        (c: { jobId: string }) => c.jobId === job,
      );
      const confirmed = await http().post(`/api/v1/cash-collections/${cash.id}/confirm`).set(owner()).expect(200);
      expect(confirmed.body.data).toMatchObject({ status: 'CONFIRMED', paymentId: null });
      const draft = (await bill({ jobId: job }).expect(201)).body.data;
      const done = await http().post(`/api/v1/bills/${draft.id}/issue`).set(owner()).expect(200);
      expect(done.body.data).toMatchObject({ payState: 'PAID', paid: 20000 });
    });

    it('the Billing tab summary adds up', async () => {
      const res = await http().get('/api/v1/billing/summary').set(owner()).expect(200);
      const open = await http().get('/api/v1/bills?filter=TO_COLLECT').set(owner()).expect(200);
      expect(res.body.data.toCollect).toBe(open.body.data.reduce((s: number, x: { remaining: number }) => s + x.remaining, 0));
      expect(res.body.data.cashWithTeams).toBe(0);
      expect(res.body.data.readyToBill.map((j: { jobId: string }) => j.jobId)).not.toContain(doneJob);
    });
  });

  describe('quotations (D-020)', () => {
    it('create, change, send, then turn into a bill once', async () => {
      const q = (
        await http()
          .post('/api/v1/quotations')
          .set(owner())
          .send({ customerId, items: [{ description: 'AMC visit, split AC', qty: 3, unitPrice: 210000 }] })
          .expect(201)
      ).body.data;
      expect(q).toMatchObject({ kind: 'QUOTATION', status: 'DRAFT', total: 630000 });
      expect(q.number).toMatch(/^Q-\d{3}$/);
      const sent = await http().post(`/api/v1/quotations/${q.id}/send`).set(owner()).expect(200);
      expect(sent.body.data.status).toBe('ISSUED');
      const changed = await http()
        .patch(`/api/v1/quotations/${q.id}`)
        .set(owner())
        .send({ version: sent.body.data.version, discount: 30000 })
        .expect(200);
      expect(changed.body.data.total).toBe(600000);
      const converted = await http().post(`/api/v1/quotations/${q.id}/convert`).set(owner()).expect(201);
      expect(converted.body.data).toMatchObject({
        kind: 'BILL',
        status: 'DRAFT',
        total: 600000,
        discount: 30000,
        fromQuotation: { id: q.id, number: q.number },
        items: [{ description: 'AMC visit, split AC', qty: 3, unitPrice: 210000 }],
      });
      const after = await http().get(`/api/v1/quotations/${q.id}`).set(owner()).expect(200);
      expect(after.body.data).toMatchObject({ status: 'CONVERTED', convertedToBill: { id: converted.body.data.id } });
      const twice = await http().post(`/api/v1/quotations/${q.id}/convert`).set(owner()).expect(409);
      expect(twice.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      // A bill id is not a quotation.
      await http().get(`/api/v1/quotations/${converted.body.data.id}`).set(owner()).expect(404);
    });
  });

  describe('balance per customer', () => {
    it('matches a hand calculation over mixed bills and payments', async () => {
      // A fresh customer so only these count.
      const c = (
        await http().post('/api/v1/customers').set(owner()).send({ name: 'Shreeji Clinic', phone: '9822077777', site: { addressLine1: 'Shop 1' } }).expect(201)
      ).body.data.id as string;
      const mk = async (paise: number, issue = true) => {
        const d = (await bill({ customerId: c, items: [{ description: 'Work', qty: 1, unitPrice: paise }] }).expect(201)).body.data;
        if (issue) await http().post(`/api/v1/bills/${d.id}/issue`).set(owner()).expect(200);
        return d.id as string;
      };
      const b1 = await mk(495600); // ₹4,956
      const b2 = await mk(310000); // ₹3,100
      const b3 = await mk(100000); // ₹1,000, cancelled after a ₹200 payment
      await mk(999900, false); // draft: does not count
      await pay(b1, { amount: 100000 }).expect(201);
      const voided = (await pay(b1, { amount: 50000 }).expect(201)).body.data.id;
      await http().post(`/api/v1/payments/${voided}/void`).set(owner()).send({ reason: 'Mistake' }).expect(200);
      await pay(b2, { amount: 310000, mode: 'BANK' }).expect(201);
      await pay(b3, { amount: 20000 }).expect(201);
      await http().post(`/api/v1/bills/${b3}/cancel`).set(owner()).send({ reason: 'Customer cancelled' }).expect(200);
      // Billed 4,956 + 3,100 = 8,056; received 1,000 + 3,100 + 200 (stays as credit) = 4,300; owes 3,756.
      const res = await http().get(`/api/v1/customers/${c}/outstanding`).set(owner()).expect(200);
      expect(res.body.data).toMatchObject({ billed: 805600, received: 430000, outstanding: 375600 });
      const list = await http().get(`/api/v1/bills?filter=TO_COLLECT&customerId=${c}`).set(owner()).expect(200);
      expect(list.body.data.map((x: { remaining: number }) => x.remaining)).toEqual([395600]);
    });
  });

  describe('who can see it', () => {
    it('is hidden from other businesses (404) and from seniors and helpers (403)', async () => {
      const any = (await http().get('/api/v1/bills?filter=ALL').set(owner()).expect(200)).body.data[0].id as string;
      const p = (await http().get(`/api/v1/bills/${any}`).set(owner()).expect(200)).body.data;
      const other = as(b.tokens.OWNER);
      await http().get(`/api/v1/bills/${any}`).set(other).expect(404);
      await http().patch(`/api/v1/bills/${any}`).set(other).send({ version: p.version, discount: 0 }).expect(404);
      await http().post(`/api/v1/bills/${any}/issue`).set(other).expect(404);
      await http().post(`/api/v1/bills/${any}/cancel`).set(other).send({ reason: 'Not mine' }).expect(404);
      await http().post(`/api/v1/bills/${any}/payments`).set(other).send({ amount: 100, mode: 'CASH', idempotencyKey: randomUUID() }).expect(404);
      await http().get(`/api/v1/bills/prefill?jobId=${doneJob}`).set(other).expect(404);
      await http().get(`/api/v1/customers/${customerId}/outstanding`).set(other).expect(404);
      await bill({ jobId: doneJob }).set(other).expect(404);
      expect((await http().get('/api/v1/bills?filter=ALL').set(other).expect(200)).body.data).toEqual([]);
      expect((await http().get('/api/v1/quotations').set(other).expect(200)).body.data).toEqual([]);
      expect((await http().get('/api/v1/billing/summary').set(other).expect(200)).body.data).toMatchObject({ toCollect: 0, cash: [] });
      for (const t of [a.tokens.SENIOR_TECHNICIAN, a.tokens.HELPER]) {
        await http().get('/api/v1/bills').set(as(t)).expect(403);
        await http().get('/api/v1/quotations').set(as(t)).expect(403);
        await http().get('/api/v1/cash-collections').set(as(t)).expect(403);
        await http().get(`/api/v1/bills/${any}`).set(as(t)).expect(403);
        await http().post(`/api/v1/bills/${any}/payments`).set(as(t)).send({ amount: 100, mode: 'CASH', idempotencyKey: randomUUID() }).expect(403);
      }
    });

    it('a payment or cash entry of another business cannot be touched', async () => {
      const id = (await issued([{ description: 'Service', qty: 1, unitPrice: 1000 }])).id;
      const p = (await pay(id, { amount: 500 }).expect(201)).body.data.id;
      await http().post(`/api/v1/payments/${p}/void`).set(as(b.tokens.OWNER)).send({ reason: 'Not mine' }).expect(404);
      const cash = (await http().get('/api/v1/cash-collections?status=CONFIRMED').set(owner()).expect(200)).body.data[0].id;
      await http().post(`/api/v1/cash-collections/${cash}/reject`).set(as(b.tokens.OWNER)).send({ reason: 'Not mine' }).expect(404);
    });
  });
});
