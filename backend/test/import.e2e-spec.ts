import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { importCustomers, readCustomerRows } from '../src/customers/import.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from './helpers/tenants.js';

const PREFIX = '90000068';
const CSV =
  'Name,Mobile,Address,Area,AC count,AC brand,AC tons\n' +
  'Meera Import,9822068001,"Flat 2, Sai Heights",Kothrud,2,Voltas,1.5\n' +
  'Rahul Import,9822068002,Shop 4 Market Road,,,,\n' +
  'Meera Again,9822068001,Flat 9,,,,\n';

describe('Customer import for pilot data entry (e2e, T6.2)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  const owner = () => ({ Authorization: `Bearer ${a.tokens.OWNER}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Import A', PREFIX);
  });

  afterAll(async () => {
    await factory.cleanUp();
    await app.close();
  });

  it('saves the rows with their address and ACs, skipping a phone seen earlier in the file', async () => {
    const { rows, errors } = readCustomerRows(CSV);
    expect(errors).toEqual([]);
    const ownerUser = await prisma.organizationMember.findUniqueOrThrow({ where: { id: a.memberIds.OWNER } });
    const result = await importCustomers(prisma, a.organizationId, ownerUser.userId, rows);
    expect(result).toMatchObject({ added: 2, acs: 2 });
    expect(result.skipped).toEqual([{ line: 4, phone: '+919822068001', savedAs: 'Meera Import' }]);

    const list = (await request(app.getHttpServer()).get('/api/v1/customers?q=Import').set(owner()).expect(200)).body.data;
    expect(list.map((c: { name: string }) => c.name).sort()).toEqual(['Meera Import', 'Rahul Import']);
    const meera = list.find((c: { name: string }) => c.name === 'Meera Import');
    const detail = (await request(app.getHttpServer()).get(`/api/v1/customers/${meera.id}`).set(owner()).expect(200)).body.data;
    expect(detail.sites).toEqual([expect.objectContaining({ addressLine1: 'Flat 2, Sai Heights', locality: 'Kothrud', isDefault: true })]);
    expect(detail.sites[0].equipment.map((e: { locationLabel: string; brand: string }) => [e.locationLabel, e.brand]).sort()).toEqual([
      ['AC 1', 'Voltas'],
      ['AC 2', 'Voltas'],
    ]);

    const log = await prisma.auditLog.findMany({ where: { organizationId: a.organizationId, action: 'CUSTOMERS_IMPORTED' } });
    expect(log).toEqual([expect.objectContaining({ actorUserId: ownerUser.userId, metadata: { customers: 2, acs: 2, skipped: 1 } })]);
  });

  it('adds nothing when the same file is imported again', async () => {
    const ownerUser = await prisma.organizationMember.findUniqueOrThrow({ where: { id: a.memberIds.OWNER } });
    const result = await importCustomers(prisma, a.organizationId, ownerUser.userId, readCustomerRows(CSV).rows);
    expect(result).toMatchObject({ added: 0, acs: 0 });
    expect(result.skipped).toHaveLength(3);
    expect(await prisma.customer.count({ where: { organizationId: a.organizationId, name: { contains: 'Import' } } })).toBe(2);
  });
});
