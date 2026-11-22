import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { TenantFactory, type TestTenant } from '../helpers/tenants.js';

const PREFIX = '90000061';
/** One business after two years (docs/12 §6 "pilot scale", sized up from the discovery numbers). */
const SCALE = { teams: 6, customers: 2000, jobs: 12_000, enquiries: 800, bills: 4000 };
const RUNS = 30;
const P95_LIMIT_MS = 500;

const day = (offset: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
const chunks = <T,>(rows: T[], size = 2000) =>
  Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));

describe('List endpoints at pilot scale (T5.4)', () => {
  let app: INestApplication<App>;
  let factory: TenantFactory;
  let prisma: PrismaService;
  let a: TestTenant;
  let busyCustomer: string;
  const results: { route: string; rows: number; p50: number; p95: number }[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = configureApp(moduleRef.createNestApplication()) as INestApplication<App>;
    await app.init();
    prisma = app.get(PrismaService);
    factory = new TenantFactory(app);
    await factory.removeLeftovers([PREFIX]);
    a = await factory.create('Perf A', PREFIX);
    const org = a.organizationId;
    const owner = a.memberIds.OWNER;

    const teams = Array.from({ length: SCALE.teams }, (_, i) => ({ id: randomUUID(), organizationId: org, name: `Team ${i + 1}` }));
    await prisma.team.createMany({ data: teams });
    await prisma.teamMember.createMany({
      data: [
        { organizationId: org, teamId: teams[0].id, organizationMemberId: a.memberIds.SENIOR_TECHNICIAN, position: 'SENIOR_TECHNICIAN', isPrimary: true },
        { organizationId: org, teamId: teams[0].id, organizationMemberId: a.memberIds.HELPER, position: 'HELPER', isPrimary: true },
      ],
    });

    const customers = Array.from({ length: SCALE.customers }, (_, i) => ({
      id: randomUUID(),
      organizationId: org,
      name: `Customer ${String(i).padStart(4, '0')} ${['Meera', 'Rahul', 'Sunita', 'Amit'][i % 4]}`,
      phone: `+9198${String(20_000_000 + i).padStart(8, '0')}`,
    }));
    const sites = customers.map((c, i) => ({
      id: randomUUID(),
      organizationId: org,
      customerId: c.id,
      addressLine1: `Flat ${i}, Sai Heights`,
      locality: 'Kothrud',
      isDefault: true,
    }));
    const acs = sites.flatMap((s, i) =>
      Array.from({ length: i % 2 ? 2 : 1 }, (_, k) => ({
        id: randomUUID(),
        organizationId: org,
        customerId: s.customerId,
        siteId: s.id,
        locationLabel: k ? 'Hall' : 'Bedroom',
        brand: 'Voltas',
        capacityTons: 1.5,
      })),
    );
    const firstAc = new Map<string, string>();
    for (const e of acs) if (!firstAc.has(e.customerId)) firstAc.set(e.customerId, e.id);
    for (const c of chunks(customers)) await prisma.customer.createMany({ data: c });
    for (const c of chunks(sites)) await prisma.site.createMany({ data: c });
    for (const c of chunks(acs)) await prisma.equipment.createMany({ data: c });

    // Jobs spread over two years up to a week ahead; every 25th is for one busy customer.
    busyCustomer = customers[0].id;
    const jobs = Array.from({ length: SCALE.jobs }, (_, i) => {
      const offset = 7 - Math.floor((i / SCALE.jobs) * 730);
      const c = i % 25 === 0 ? 0 : i % SCALE.customers;
      const status =
        offset > 0
          ? 'ASSIGNED'
          : offset === 0
            ? (['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] as const)[i % 3]
            : i % 20 === 0
              ? 'CANCELLED'
              : 'COMPLETED';
      return {
        id: randomUUID(),
        organizationId: org,
        jobNumber: 1001 + i,
        customerId: customers[c].id,
        siteId: sites[c].id,
        createdByMemberId: owner,
        type: (['SERVICE', 'REPAIR', 'INSTALLATION'] as const)[i % 3],
        scheduledDate: day(offset),
        assignedTeamId: teams[i % SCALE.teams].id,
        status,
      };
    });
    for (const c of chunks(jobs)) await prisma.serviceJob.createMany({ data: c });
    const jobAcs = jobs.map((j) => ({ organizationId: org, jobId: j.id, equipmentId: firstAc.get(j.customerId) as string }));
    for (const c of chunks(jobAcs)) await prisma.jobEquipment.createMany({ data: c });
    await prisma.organization.update({ where: { id: org }, data: { nextJobNumber: 1001 + SCALE.jobs } });

    const enquiries = Array.from({ length: SCALE.enquiries }, (_, i) => ({
      organizationId: org,
      requestNumber: 201 + i,
      customerId: customers[i].id,
      siteId: sites[i].id,
      createdByMemberId: owner,
      status: (i % 10 === 0 ? 'OPEN' : i % 3 ? 'CONVERTED' : 'CLOSED') as 'OPEN' | 'CONVERTED' | 'CLOSED',
    }));
    await prisma.serviceRequest.createMany({ data: enquiries });

    const bills = Array.from({ length: SCALE.bills }, (_, i) => ({
      id: randomUUID(),
      organizationId: org,
      kind: 'BILL' as const,
      number: i + 1,
      customerId: customers[i % SCALE.customers].id,
      billDate: day(-Math.floor((i / SCALE.bills) * 730)),
      createdByMemberId: owner,
      status: 'ISSUED' as const,
      subtotal: 120_000,
      total: 120_000,
      paid: i % 4 ? 120_000 : i % 8 ? 50_000 : 0,
    }));
    for (const c of chunks(bills)) await prisma.invoice.createMany({ data: c });
    const items = bills.flatMap((b) => [
      { organizationId: org, invoiceId: b.id, position: 0, description: 'Service', qty: 1, unitPrice: 80_000, amount: 80_000 },
      { organizationId: org, invoiceId: b.id, position: 1, description: 'Gas top-up', qty: 1, unitPrice: 40_000, amount: 40_000 },
    ]);
    for (const c of chunks(items)) await prisma.invoiceItem.createMany({ data: c });
    await prisma.organization.update({ where: { id: org }, data: { nextBillNumber: SCALE.bills + 1 } });
  });

  afterAll(async () => {
    console.table(results);
    await factory.cleanUp();
    await app.close();
  });

  /** p95 of RUNS calls after 3 warm-up calls, in ms. */
  const time = async (route: string, token: () => string) => {
    const call = () => request(app.getHttpServer()).get(route).set('Authorization', `Bearer ${token()}`);
    for (let i = 0; i < 3; i++) await call().expect(200);
    const ms: number[] = [];
    let rows = 0;
    for (let i = 0; i < RUNS; i++) {
      const t = performance.now();
      const res = await call().expect(200);
      ms.push(performance.now() - t);
      const d = res.body.data;
      rows = Array.isArray(d) ? d.length : Array.isArray(d?.jobs) ? d.jobs.length : 1;
    }
    ms.sort((x, y) => x - y);
    const p = (q: number) => Math.round(ms[Math.min(ms.length - 1, Math.ceil(q * ms.length) - 1)]);
    results.push({ route, rows, p50: p(0.5), p95: p(0.95) });
    return p(0.95);
  };

  const owner = () => a.tokens.OWNER;
  const senior = () => a.tokens.SENIOR_TECHNICIAN;
  it.each([
    ['/api/v1/dashboard', owner],
    ['/api/v1/jobs', owner],
    ['/api/v1/jobs?status=OPEN', owner],
    ['/api/v1/customers', owner],
    ['/api/v1/customers?q=Meera', owner],
    ['/api/v1/customers?q=0001', owner],
    ['/api/v1/enquiries', owner],
    ['/api/v1/bills', owner],
    ['/api/v1/bills?filter=ALL', owner],
    ['/api/v1/billing/summary', owner],
    ['/api/v1/cash-collections', owner],
    ['/api/v1/updates', owner],
    ['/api/v1/my/jobs', senior],
    ['/api/v1/sync/bootstrap', senior],
  ] as const)('%s p95 under the limit', async (route, token) => {
    expect(await time(route, token)).toBeLessThan(P95_LIMIT_MS);
  });

  it('customer history for a customer with ~500 jobs', async () => {
    expect(await time(`/api/v1/customers/${busyCustomer}/history`, owner)).toBeLessThan(P95_LIMIT_MS);
  });
});
