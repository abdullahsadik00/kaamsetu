import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX = '90000060';

describe('Audit log for money and people (e2e, T5.5, docs/10 §5)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  const http = () => request(app.getHttpServer());
  const owner = () => ({ Authorization: `Bearer ${a.tokens.OWNER}` });
  const log = () =>
    prisma.auditLog.findMany({ where: { organizationId: a.organizationId }, orderBy: { createdAt: 'asc' } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Audit A', PREFIX);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('records bill issue, payment, void and cancel with who and how much', async () => {
    const c = (await http().post('/api/v1/customers').set(owner()).send({ name: 'Meera', phone: '9822060001', site: { addressLine1: 'Flat 1' } }).expect(201)).body.data;
    const draft = (await http().post('/api/v1/bills').set(owner()).send({ customerId: c.id, items: [{ description: 'Service', qty: 1, unitPrice: 50000 }] }).expect(201)).body.data;
    await http().post(`/api/v1/bills/${draft.id}/issue`).set(owner()).expect(200);
    const paid = (await http().post(`/api/v1/bills/${draft.id}/payments`).set(owner()).send({ mode: 'CASH', amount: 20000, idempotencyKey: randomUUID() }).expect(201)).body.data;
    await http().post(`/api/v1/payments/${paid.payment?.id ?? paid.id}/void`).set(owner()).send({ reason: 'Typed wrong amount' }).expect(200);
    await http().post(`/api/v1/bills/${draft.id}/cancel`).set(owner()).send({ reason: 'Customer changed mind' }).expect(200);

    const rows = await log();
    expect(rows.map((r) => r.action)).toEqual(['BILL_ISSUED', 'PAYMENT_RECORDED', 'PAYMENT_VOIDED', 'BILL_CANCELLED']);
    for (const r of rows) expect(r.actorUserId).not.toBe('');
    expect(rows[1].metadata).toMatchObject({ amount: 20000, mode: 'CASH', invoiceId: draft.id });
    expect(rows[2].metadata).toMatchObject({ amount: 20000, reason: 'Typed wrong amount' });
    expect(rows[3]).toMatchObject({ entityType: 'Invoice', entityId: draft.id, metadata: { reason: 'Customer changed mind' } });
  });

  it('records adding an employee, resetting their login and removing them; a refused action leaves no row', async () => {
    const before = (await log()).length;
    const added = (await http().post('/api/v1/employees').set(owner()).send({ name: 'New Helper', phone: `${PREFIX}11`, role: 'HELPER' }).expect(201)).body.data;
    await http().post(`/api/v1/employees/${added.id}/reset-login`).set(owner()).expect(200);
    await http().post(`/api/v1/employees/${a.memberIds.OWNER}/deactivate`).set(owner()).expect(400);
    await http().post(`/api/v1/employees/${added.id}/deactivate`).set(owner()).expect(200);

    const rows = (await log()).slice(before);
    expect(rows.map((r) => [r.action, r.entityId])).toEqual([
      ['EMPLOYEE_ADDED', added.id],
      ['LOGIN_RESET', added.id],
      ['EMPLOYEE_REMOVED', added.id],
    ]);
    expect(rows[0].metadata).toEqual({ role: 'HELPER' });
  });
});
