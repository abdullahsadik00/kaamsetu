import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** D-040: a new table must enable RLS in its migration, or Supabase's Data API could read it. */
describe('Row-level security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('is on for every table in public', async () => {
    const off = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity`;
    expect(off.map((r) => r.relname)).toEqual([]);
  });

  it('still lets the API read as the table owner', async () => {
    await expect(prisma.organization.count()).resolves.toBeGreaterThanOrEqual(0);
  });
});
