import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Param, Patch, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { GST_RATES } from './money.js';

// ---------- Rate list (docs/06 §8, T4.10, D-039) ----------

const RateFields = {
  name: z.string().trim().min(1).max(120),
  /** Paise. */
  unitPrice: z.number().int().min(0).max(1_000_000_000),
  gstRate: z.literal(GST_RATES),
};
export const CreateRateSchema = z.strictObject({ ...RateFields, gstRate: RateFields.gstRate.default(0) });
export const UpdateRateSchema = z.strictObject({
  name: RateFields.name.optional(),
  unitPrice: RateFields.unitPrice.optional(),
  gstRate: RateFields.gstRate.optional(),
  /** Off: no longer offered on new bills; saved bills keep their lines. */
  active: z.boolean().optional(),
});
export const ListRatesSchema = z.strictObject({ all: z.enum(['true', 'false']).optional() });
export type CreateRate = z.infer<typeof CreateRateSchema>;
export type UpdateRate = z.infer<typeof UpdateRateSchema>;

const select = { id: true, name: true, unitPrice: true, gstRate: true, active: true } as const;

/** The business's usual prices; picking one copies it into a bill line (snapshot, docs/05 §InvoiceItem). */
@Injectable()
export class RatesService {
  constructor(private readonly prisma: PrismaService) {}

  list(auth: AuthContext, all: boolean) {
    return this.prisma.rateItem.findMany({
      where: scoped(auth, all ? {} : { active: true }),
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
      take: 200,
      select,
    });
  }

  async create(auth: AuthContext, input: CreateRate) {
    const organizationId = requireOrg(auth);
    await this.uniqueName(auth, input.name);
    return this.prisma.rateItem.create({ data: { organizationId, ...input }, select });
  }

  async update(auth: AuthContext, id: string, input: UpdateRate) {
    if (input.name) await this.uniqueName(auth, input.name, id);
    const r = await this.prisma.rateItem.updateMany({ where: scoped(auth, { id }), data: input });
    if (r.count === 0) throw AppError.notFound('RATE_NOT_FOUND');
    return this.prisma.rateItem.findFirstOrThrow({ where: scoped(auth, { id }), select });
  }

  /** One active row per name (any case), so the picker never shows two "Gas filling". */
  private async uniqueName(auth: AuthContext, name: string, exceptId?: string) {
    const same = await this.prisma.rateItem.findFirst({
      where: scoped(auth, { name: { equals: name, mode: 'insensitive' as const }, active: true, ...(exceptId ? { id: { not: exceptId } } : {}) }),
      select: { id: true },
    });
    if (same) throw new AppError(HttpStatus.CONFLICT, 'RATE_NAME_EXISTS', 'This item is already in the rate list.', { rateId: same.id });
  }
}

const Id = new ZodValidationPipe(z.uuid());

/** Rate list, owner only (T4.10, D-039). Money is in paise. */
@Roles('OWNER')
@Controller('rate-items')
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get()
  list(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ListRatesSchema)) q: { all?: 'true' | 'false' }) {
    return this.rates.list(auth, q.all === 'true');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentAuth() auth: AuthContext, @Body(new ZodValidationPipe(CreateRateSchema)) body: CreateRate) {
    return this.rates.create(auth, body);
  }

  @Patch(':id')
  update(@CurrentAuth() auth: AuthContext, @Param('id', Id) id: string, @Body(new ZodValidationPipe(UpdateRateSchema)) body: UpdateRate) {
    return this.rates.update(auth, id, body);
  }
}
