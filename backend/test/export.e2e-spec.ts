import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX_A = '90000066';
const PREFIX_B = '90000067';

describe('Business data export (e2e, doc 10 §4)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let a: TestTenant;
  let b: TestTenant;
  const http = () => request(app.getHttpServer());
  const as = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX_A, PREFIX_B]);
    a = await factory.create('Export A', PREFIX_A);
    b = await factory.create('Export B', PREFIX_B);
    for (const [t, name] of [[a, 'Meera Export'], [b, 'Other Business Customer']] as const) {
      const c = (await http().post('/api/v1/customers').set(as(t.tokens.OWNER)).send({ name, phone: t === a ? '9822066001' : '9822067001', site: { addressLine1: 'Flat 1' } }).expect(201)).body.data;
      const bill = (await http().post('/api/v1/bills').set(as(t.tokens.OWNER)).send({ customerId: c.id, items: [{ description: 'Service', qty: 1, unitPrice: 50000 }] }).expect(201)).body.data;
      await http().post(`/api/v1/bills/${bill.id}/issue`).set(as(t.tokens.OWNER)).expect(200);
      await http().post(`/api/v1/bills/${bill.id}/payments`).set(as(t.tokens.OWNER)).send({ mode: 'UPI', amount: 50000, idempotencyKey: randomUUID() }).expect(201);
    }
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('the owner gets their business’s records, without login secrets or another business’s data', async () => {
    const res = await http().get('/api/v1/organization/export').set(as(a.tokens.OWNER)).expect(200);
    const data = res.body.data;
    expect(data).toMatchObject({ format: 'kaamsetu-business-export', version: 1, business: { id: a.organizationId } });
    expect(data.customers.map((c: { name: string }) => c.name)).toEqual(['Meera Export']);
    expect(data.sites).toHaveLength(1);
    expect(data.invoices).toHaveLength(1);
    expect(data.invoiceItems).toHaveLength(1);
    expect(data.payments).toEqual([expect.objectContaining({ amount: 50000, mode: 'UPI' })]);
    expect(data.people).toHaveLength(3);
    const text = JSON.stringify(data);
    for (const secret of ['googleSubject', 'tokenHash', 'idempotencyKey', 'codeHash', 'Other Business Customer', b.organizationId]) {
      expect(text).not.toContain(secret);
    }
  });

  it('only the owner may export, and each export is in the audit log', async () => {
    await http().get('/api/v1/organization/export').set(as(a.tokens.SENIOR_TECHNICIAN)).expect(403);
    await http().get('/api/v1/organization/export').set(as(a.tokens.HELPER)).expect(403);
    const rows = await app.get(PrismaService).auditLog.findMany({ where: { organizationId: a.organizationId, action: 'DATA_EXPORTED' } });
    expect(rows).toHaveLength(1);
    expect(rows[0].metadata).toMatchObject({ customers: 1, invoices: 1, payments: 1 });
  });
});
