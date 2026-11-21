import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import type { Invoice, InvoiceKind, InvoiceStatus, JobType, Prisma } from '../generated/prisma/client.js';
import { day, fromDate, toDate } from '../jobs/jobs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { GST_RATES, billLabel, billTotals, payState, remaining } from './money.js';

// ---------- Contracts (docs/06 §8, T4.10/T4.11, D-034) ----------

/** Paise; one line or bill up to ₹1 crore (fits a 32-bit column with room). */
const money = z.number().int().min(0).max(1_000_000_000);

export const ItemSchema = z.strictObject({
  description: z.string().trim().min(1).max(120),
  qty: z.number().int().min(1).max(999),
  unitPrice: money,
  gstRate: z.literal(GST_RATES).default(0),
});
export type ItemInput = z.infer<typeof ItemSchema>;

export const CreateBillSchema = z
  .strictObject({
    customerId: z.uuid().optional(),
    siteId: z.uuid().optional(),
    /** A completed job: customer and address come from it; lines too when `items` is left out. */
    jobId: z.uuid().optional(),
    gstBill: z.boolean().optional(),
    discount: money.default(0),
    billDate: day.optional(),
    items: z.array(ItemSchema).min(1).max(50).optional(),
  })
  .refine((b) => b.customerId || b.jobId, { path: ['customerId'], message: 'Choose a customer' })
  .refine((b) => b.jobId || b.items, { path: ['items'], message: 'Add at least one item' });
export type CreateBill = z.infer<typeof CreateBillSchema>;

export const CreateQuotationSchema = z.strictObject({
  customerId: z.uuid(),
  siteId: z.uuid().optional(),
  gstBill: z.boolean().optional(),
  discount: money.default(0),
  billDate: day.optional(),
  items: z.array(ItemSchema).min(1).max(50),
});
export type CreateQuotation = z.infer<typeof CreateQuotationSchema>;

export const UpdateInvoiceSchema = z.strictObject({
  /** The version the owner saw; a stale edit is refused (VERSION_CONFLICT). */
  version: z.number().int().min(1),
  siteId: z.uuid().nullable().optional(),
  gstBill: z.boolean().optional(),
  discount: money.optional(),
  billDate: day.optional(),
  items: z.array(ItemSchema).min(1).max(50).optional(),
});
export type UpdateInvoice = z.infer<typeof UpdateInvoiceSchema>;

export const ListBillsSchema = z.strictObject({
  /** TO_COLLECT = not paid + partly paid (the Billing tab's first list). */
  filter: z.enum(['TO_COLLECT', 'NOT_PAID', 'PARTLY_PAID', 'PAID', 'ALL']).default('TO_COLLECT'),
  customerId: z.uuid().optional(),
});
export type ListBills = z.infer<typeof ListBillsSchema>;

export const ListQuotationsSchema = z.strictObject({
  status: z.enum(['OPEN', 'ALL']).default('ALL'),
  customerId: z.uuid().optional(),
});
export type ListQuotations = z.infer<typeof ListQuotationsSchema>;

export const PrefillSchema = z.strictObject({ jobId: z.uuid() });

export const ReasonSchema = z.strictObject({ reason: z.string().trim().min(2, 'Give a reason').max(200) });

export const PaymentSchema = z.strictObject({
  amount: z.number().int().min(1).max(1_000_000_000),
  mode: z.enum(['CASH', 'UPI', 'BANK', 'OTHER']),
  /** Day the money came (defaults to today). */
  receivedAt: day.optional(),
  note: z.string().trim().max(200).optional(),
  /** Phone-generated, one per "Save payment" tap; sending it again returns the same payment. */
  idempotencyKey: z.string().min(8).max(64),
  /** Needed to take more than what is left on the bill. */
  allowOverpay: z.boolean().default(false),
});
export type PaymentInput = z.infer<typeof PaymentSchema>;

export const ConfirmCashSchema = z.strictObject({
  /** Also record it as a payment on the job's bill, when the job has an issued bill. */
  addToBill: z.boolean().default(true),
}).default({ addToBill: true });

export const ListCashSchema = z.strictObject({
  status: z.enum(['WITH_TEAM', 'CONFIRMED', 'REJECTED']).default('WITH_TEAM'),
});

/** Service line names for a bill made from a job (the phone shows its own translated label). */
const JOB_LINE: Record<JobType, string> = {
  SERVICE: 'AC service',
  REPAIR: 'AC repair visit',
  INSTALLATION: 'AC installation',
  UNINSTALLATION: 'AC uninstallation',
  GAS_FILLING: 'Gas filling',
  OTHER: 'Service visit',
};
/** Usual AC service rate for a GST bill; the owner can change it per line (provisional, Q-04). */
const DEFAULT_GST_RATE = 18;

const BILL_EDITABLE: InvoiceStatus[] = ['DRAFT'];
const QUOTE_EDITABLE: InvoiceStatus[] = ['DRAFT', 'ISSUED'];

/** Today's date in India as YYYY-MM-DD (bill and payment dates are calendar days). */
export const todayInIndia = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

const isUniqueViolation = (e: unknown) => (e as { code?: string } | null)?.code === 'P2002';

/** Bills, quotations, payments and cash handed over by teams; owner only. Every query is scoped to the business. */
@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Lists ----------

  async listBills(auth: AuthContext, q: ListBills) {
    const total = this.prisma.invoice.fields.total;
    const filters: Record<ListBills['filter'], Prisma.InvoiceWhereInput> = {
      TO_COLLECT: { status: 'ISSUED', paid: { lt: total } },
      NOT_PAID: { status: 'ISSUED', paid: 0, total: { gt: 0 } },
      PARTLY_PAID: { status: 'ISSUED', paid: { gt: 0, lt: total } },
      PAID: { status: 'ISSUED', paid: { gte: total } },
      ALL: {},
    };
    const rows = await this.prisma.invoice.findMany({
      where: scoped(auth, { kind: 'BILL' as const, ...filters[q.filter], ...(q.customerId ? { customerId: q.customerId } : {}) }),
      orderBy: [{ billDate: 'desc' }, { number: 'desc' }],
      take: 100,
    });
    return this.decorate(auth, rows);
  }

  async listQuotations(auth: AuthContext, q: ListQuotations) {
    const rows = await this.prisma.invoice.findMany({
      where: scoped(auth, {
        kind: 'QUOTATION' as const,
        ...(q.status === 'OPEN' ? { status: { in: ['DRAFT', 'ISSUED'] as InvoiceStatus[] } } : {}),
        ...(q.customerId ? { customerId: q.customerId } : {}),
      }),
      orderBy: [{ billDate: 'desc' }, { number: 'desc' }],
      take: 100,
    });
    return this.decorate(auth, rows);
  }

  /** Billing tab header (Stitch 33): to collect, cash with teams, completed jobs without a bill. */
  async summary(auth: AuthContext) {
    const open = await this.prisma.invoice.aggregate({
      where: scoped(auth, { kind: 'BILL' as const, status: 'ISSUED' as const, paid: { lt: this.prisma.invoice.fields.total } }),
      _sum: { total: true, paid: true },
    });
    const cash = await this.listCash(auth, 'WITH_TEAM');
    const done = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { status: 'COMPLETED' as const }),
      orderBy: [{ completedAt: 'desc' }, { jobNumber: 'desc' }],
      take: 50,
      select: { id: true, jobNumber: true, type: true, customerId: true, completedAt: true, amountToCollect: true },
    });
    const billed = await this.prisma.invoice.findMany({
      where: scoped(auth, { billForJobId: { in: done.map((j) => j.id) } }),
      select: { billForJobId: true },
    });
    const has = new Set(billed.map((b) => b.billForJobId));
    const ready = done.filter((j) => !has.has(j.id)).slice(0, 20);
    const names = await this.customerNames(auth, ready.map((j) => j.customerId));
    return {
      toCollect: (open._sum.total ?? 0) - (open._sum.paid ?? 0),
      cashWithTeams: cash.reduce((s, c) => s + c.amount, 0),
      readyToBill: ready.map((j) => ({
        jobId: j.id,
        jobNumber: j.jobNumber,
        type: j.type,
        customerId: j.customerId,
        customerName: names.get(j.customerId) ?? '',
        completedAt: j.completedAt,
        amountToCollect: j.amountToCollect,
      })),
      cash,
    };
  }

  // ---------- One bill or quotation ----------

  async get(auth: AuthContext, kind: InvoiceKind, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: scoped(auth, { id, kind }),
      include: { items: { orderBy: { position: 'asc' } }, payments: { orderBy: { createdAt: 'asc' } } },
    });
    if (!inv) throw this.notFound(kind);
    const [row] = await this.decorate(auth, [inv]);
    const customer = await this.prisma.customer.findFirst({
      where: scoped(auth, { id: inv.customerId }),
      select: { id: true, name: true, phone: true, gstin: true },
    });
    const site = inv.siteId ? await this.prisma.site.findFirst({ where: scoped(auth, { id: inv.siteId }) }) : null;
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: requireOrg(auth) },
      select: { name: true, phone: true, gstin: true },
    });
    const collections = inv.jobId
      ? await this.prisma.cashCollection.findMany({ where: scoped(auth, { jobId: inv.jobId }), orderBy: { createdAt: 'asc' } })
      : [];
    const linked = await this.prisma.invoice.findMany({
      where: scoped(auth, { id: { in: [inv.fromQuotationId, inv.convertedToBillId].filter((x): x is string => !!x) } }),
      select: { id: true, kind: true, number: true },
    });
    const link = (lid: string | null) => {
      const l = linked.find((x) => x.id === lid);
      return l ? { id: l.id, number: billLabel(l.kind, l.number) } : null;
    };
    // GST split per rate from the saved lines.
    const gst = billTotals(
      inv.items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, gstRate: i.gstRate })),
      inv.discount,
      inv.gstBill,
    ).gst;
    return {
      ...row,
      subtotal: inv.subtotal,
      discount: inv.discount,
      taxTotal: inv.taxTotal,
      gst,
      sellerGstin: inv.sellerGstin ?? (inv.gstBill ? org.gstin : null),
      buyerGstin: inv.buyerGstin ?? (inv.gstBill ? (customer?.gstin ?? null) : null),
      business: { name: org.name, phone: org.phone },
      issuedAt: inv.issuedAt,
      cancelReason: inv.cancelReason,
      version: inv.version,
      customer,
      site: site && { id: site.id, label: site.label, addressLine1: site.addressLine1, locality: site.locality, city: site.city },
      fromQuotation: link(inv.fromQuotationId),
      convertedToBill: link(inv.convertedToBillId),
      items: inv.items.map((i) => ({
        id: i.id,
        description: i.description,
        qty: i.qty,
        unitPrice: i.unitPrice,
        gstRate: i.gstRate,
        amount: i.amount,
        cgst: i.cgst,
        sgst: i.sgst,
      })),
      payments: inv.payments.map((p) => this.paymentView(p)),
      // Money the team took on site for this job (D-008).
      collections: collections.map((c) => ({ id: c.id, amount: c.amount, mode: c.mode, status: c.status, paymentId: c.paymentId })),
    };
  }

  /**
   * Lines for a bill from a completed job (Stitch 34), not saved: the service
   * with the job's amount to collect, then the parts from the work report.
   */
  async prefill(auth: AuthContext, jobId: string) {
    const job = await this.completedJob(this.prisma, auth, jobId);
    const customer = await this.prisma.customer.findFirst({
      where: scoped(auth, { id: job.customerId }),
      select: { id: true, name: true, phone: true, gstBills: true, gstin: true },
    });
    if (!customer) throw AppError.notFound('CUSTOMER_NOT_FOUND');
    const org = await this.prisma.organization.findUniqueOrThrow({ where: { id: requireOrg(auth) }, select: { gstBills: true } });
    const gstBill = org.gstBills && customer.gstBills;
    const existing = await this.prisma.invoice.findFirst({ where: scoped(auth, { billForJobId: job.id }), select: { id: true } });
    const collections = await this.prisma.cashCollection.findMany({ where: scoped(auth, { jobId: job.id }), orderBy: { createdAt: 'asc' } });
    return {
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobType: job.type,
      customer,
      siteId: job.siteId,
      gstBill,
      items: this.jobLines(job, gstBill),
      collections: collections.map((c) => ({ id: c.id, amount: c.amount, mode: c.mode, status: c.status })),
      existingBillId: existing?.id ?? null,
    };
  }

  // ---------- Create, edit, issue, cancel ----------

  /** Saves a draft bill with the next number (KS-0001…). */
  async createBill(auth: AuthContext, input: CreateBill) {
    const id = await this.run(async (tx) => {
      let { customerId, siteId, items } = input;
      let jobId: string | null = null;
      let gstDefault: boolean | undefined;
      if (input.jobId) {
        const job = await this.completedJob(tx, auth, input.jobId);
        const already = await tx.invoice.findFirst({ where: scoped(auth, { billForJobId: job.id }), select: { id: true } });
        if (already) throw this.alreadyBilled(already.id);
        customerId = job.customerId;
        siteId = job.siteId;
        jobId = job.id;
        if (!items) {
          gstDefault = await this.gstDefault(tx, auth, customerId);
          items = this.jobLines(job, input.gstBill ?? gstDefault).map(({ description, qty, unitPrice, gstRate }) => ({
            description,
            qty,
            unitPrice,
            gstRate: gstRate as ItemInput['gstRate'],
          }));
        }
      }
      return this.insert(tx, auth, 'BILL', {
        customerId: customerId as string,
        siteId,
        jobId,
        gstBill: input.gstBill ?? gstDefault,
        discount: input.discount,
        billDate: input.billDate,
        items: items as ItemInput[],
      });
    }, input.jobId);
    return this.get(auth, 'BILL', id);
  }

  /** Saves a draft quotation with the next number (Q-001…). */
  async createQuotation(auth: AuthContext, input: CreateQuotation) {
    const id = await this.prisma.$transaction((tx) => this.insert(tx, auth, 'QUOTATION', { ...input, jobId: null }));
    return this.get(auth, 'QUOTATION', id);
  }

  /** Edits a draft bill, or a quotation not yet converted. Refuses stale versions. */
  async update(auth: AuthContext, kind: InvoiceKind, id: string, input: UpdateInvoice) {
    await this.prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findFirst({ where: scoped(auth, { id, kind }), include: { items: { orderBy: { position: 'asc' } } } });
      if (!inv) throw this.notFound(kind);
      const editable = kind === 'BILL' ? BILL_EDITABLE : QUOTE_EDITABLE;
      if (!editable.includes(inv.status)) {
        if (kind === 'BILL' && inv.status === 'ISSUED') {
          throw new AppError(HttpStatus.CONFLICT, 'BILL_ISSUED', "A saved bill can't be changed. Cancel it and make a new one.");
        }
        throw this.invalid(inv.status);
      }
      if (input.siteId) await this.checkSite(tx, auth, inv.customerId, input.siteId);
      const claimed = await tx.invoice.updateMany({
        where: scoped(auth, { id, version: input.version, status: { in: editable } }),
        data: {
          version: { increment: 1 },
          ...(input.siteId !== undefined ? { siteId: input.siteId } : {}),
          ...(input.billDate ? { billDate: toDate(input.billDate) as Date } : {}),
        },
      });
      if (claimed.count === 0) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'VERSION_CONFLICT',
          'This was changed in the meantime. Here is the latest version.',
        );
      }
      const items: ItemInput[] =
        input.items ?? inv.items.map((i) => ({ description: i.description, qty: i.qty, unitPrice: i.unitPrice, gstRate: i.gstRate as ItemInput['gstRate'] }));
      await this.saveLines(tx, inv, items, input.discount ?? inv.discount, input.gstBill ?? inv.gstBill);
    });
    return this.get(auth, kind, id);
  }

  /**
   * Makes a draft bill final (it cannot change after this), keeps the GSTINs
   * as they are today, and records cash the owner already confirmed for the job.
   */
  async issue(auth: AuthContext, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const inv = await this.lock(tx, auth, 'BILL', id);
      if (inv.status !== 'DRAFT') throw this.invalid(inv.status);
      const gst = inv.gstBill ? await this.gstins(tx, auth, inv.customerId) : null;
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
          sellerGstin: gst?.seller ?? null,
          buyerGstin: gst?.buyer ?? null,
          version: { increment: 1 },
        },
      });
      if (inv.jobId) {
        const confirmed = await tx.cashCollection.findMany({
          where: scoped(auth, { jobId: inv.jobId, status: 'CONFIRMED' as const, paymentId: null }),
          orderBy: { createdAt: 'asc' },
        });
        for (const c of confirmed) await this.payFromCollection(tx, auth, id, c);
      }
    });
    return this.get(auth, 'BILL', id);
  }

  /** Marks a quotation as sent (sending it again is fine). */
  async send(auth: AuthContext, id: string) {
    const inv = await this.find(auth, 'QUOTATION', id);
    if (inv.status === 'DRAFT') {
      await this.prisma.invoice.updateMany({
        where: scoped(auth, { id, status: 'DRAFT' as const }),
        data: { status: 'ISSUED', issuedAt: new Date(), version: { increment: 1 } },
      });
    } else if (inv.status !== 'ISSUED') {
      throw this.invalid(inv.status);
    }
    return this.get(auth, 'QUOTATION', id);
  }

  /** Cancels with a reason; the record stays (payments stay with the customer). */
  async cancel(auth: AuthContext, kind: InvoiceKind, id: string, reason: string) {
    const inv = await this.find(auth, kind, id);
    const result = await this.prisma.invoice.updateMany({
      where: scoped(auth, { id, kind, status: { in: ['DRAFT', 'ISSUED'] as InvoiceStatus[] } }),
      data: { status: 'CANCELLED', cancelReason: reason, cancelledAt: new Date(), billForJobId: null, version: { increment: 1 } },
    });
    if (result.count === 0) throw this.invalid(inv.status);
    return this.get(auth, kind, id);
  }

  /** Turns a quotation into a draft bill with the same lines (D-020). Returns the bill. */
  async convert(auth: AuthContext, id: string) {
    const billId = await this.prisma.$transaction(async (tx) => {
      const q = await tx.invoice.findFirst({ where: scoped(auth, { id, kind: 'QUOTATION' as const }), include: { items: { orderBy: { position: 'asc' } } } });
      if (!q) throw this.notFound('QUOTATION');
      // Claim it first so two taps make one bill.
      const claimed = await tx.invoice.updateMany({
        where: { id, status: { in: ['DRAFT', 'ISSUED'] } },
        data: { status: 'CONVERTED', version: { increment: 1 } },
      });
      if (claimed.count === 0) throw this.invalid(q.status);
      const bill = await this.insert(tx, auth, 'BILL', {
        customerId: q.customerId,
        siteId: q.siteId,
        jobId: null,
        gstBill: q.gstBill,
        discount: q.discount,
        items: q.items.map((i) => ({ description: i.description, qty: i.qty, unitPrice: i.unitPrice, gstRate: i.gstRate as ItemInput['gstRate'] })),
        fromQuotationId: q.id,
      });
      await tx.invoice.update({ where: { id }, data: { convertedToBillId: bill } });
      return bill;
    });
    return this.get(auth, 'BILL', billId);
  }

  // ---------- Payments (T4.11) ----------

  /**
   * Records money received on an issued bill. The same idempotency key again
   * returns the first payment; more than what is left needs `allowOverpay`.
   */
  async recordPayment(auth: AuthContext, billId: string, input: PaymentInput) {
    const organizationId = requireOrg(auth);
    const earlier = await this.prisma.payment.findFirst({ where: scoped(auth, { idempotencyKey: input.idempotencyKey }) });
    if (earlier) return this.replay(earlier, billId, input);
    try {
      const id = await this.prisma.$transaction(async (tx) => {
        const bill = await this.lock(tx, auth, 'BILL', billId);
        // A twin request may have saved it while we waited for the lock.
        const twin = await tx.payment.findFirst({ where: { organizationId, idempotencyKey: input.idempotencyKey } });
        if (twin) return twin.id;
        if (bill.status !== 'ISSUED') {
          throw new AppError(HttpStatus.CONFLICT, 'BILL_NOT_ISSUED', 'Payments can be added only to a saved bill.');
        }
        const left = bill.total - bill.paid;
        if (input.amount > left && !input.allowOverpay) {
          throw new AppError(HttpStatus.CONFLICT, 'OVERPAY', 'This is more than what is left on the bill.', {
            remaining: Math.max(left, 0),
          });
        }
        const p = await tx.payment.create({
          data: {
            organizationId,
            invoiceId: bill.id,
            customerId: bill.customerId,
            amount: input.amount,
            mode: input.mode,
            receivedAt: toDate(input.receivedAt ?? todayInIndia()) as Date,
            note: input.note || null,
            idempotencyKey: input.idempotencyKey,
            recordedByMemberId: auth.memberId as string,
          },
        });
        await tx.invoice.update({ where: { id: bill.id }, data: { paid: { increment: input.amount } } });
        return p.id;
      });
      const p = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
      return this.replay(p, billId, input);
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      const twin = await this.prisma.payment.findFirst({ where: scoped(auth, { idempotencyKey: input.idempotencyKey }) });
      if (!twin) throw e;
      return this.replay(twin, billId, input);
    }
  }

  /** Voids a payment with a reason. The row stays (audit); the bill's balance goes back up. */
  async voidPayment(auth: AuthContext, id: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      const p = await tx.payment.findFirst({ where: scoped(auth, { id }) });
      if (!p) throw AppError.notFound('PAYMENT_NOT_FOUND');
      await this.lock(tx, auth, 'BILL', p.invoiceId);
      const done = await tx.payment.updateMany({
        where: { id, voidedAt: null },
        data: { voidedAt: new Date(), voidReason: reason, voidedByMemberId: auth.memberId as string },
      });
      if (done.count === 0) {
        throw new AppError(HttpStatus.CONFLICT, 'INVALID_STATUS_TRANSITION', 'This payment was already removed.');
      }
      await tx.invoice.update({ where: { id: p.invoiceId }, data: { paid: { decrement: p.amount } } });
    });
    const p = await this.prisma.payment.findUniqueOrThrow({ where: { id } });
    return this.paymentView(p);
  }

  /**
   * What a customer owes: issued bills minus every payment not voided
   * (payments on a cancelled bill stay with the customer as credit).
   */
  async outstanding(auth: AuthContext, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: scoped(auth, { id: customerId }), select: { id: true, name: true } });
    if (!customer) throw AppError.notFound('CUSTOMER_NOT_FOUND');
    const billed = await this.prisma.invoice.aggregate({
      where: scoped(auth, { customerId, kind: 'BILL' as const, status: 'ISSUED' as const }),
      _sum: { total: true },
    });
    const received = await this.prisma.payment.aggregate({
      where: scoped(auth, { customerId, voidedAt: null }),
      _sum: { amount: true },
    });
    const b = billed._sum.total ?? 0;
    const r = received._sum.amount ?? 0;
    return { customerId, customerName: customer.name, billed: b, received: r, outstanding: b - r };
  }

  // ---------- Cash with teams (D-008) ----------

  async listCash(auth: AuthContext, status: 'WITH_TEAM' | 'CONFIRMED' | 'REJECTED') {
    const rows = await this.prisma.cashCollection.findMany({
      where: scoped(auth, { status }),
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { id: { in: rows.map((r) => r.jobId) } }),
      select: { id: true, jobNumber: true, customerId: true },
    });
    const members = await this.prisma.organizationMember.findMany({
      where: scoped(auth, { id: { in: rows.map((r) => r.collectedByMemberId) } }),
      select: { id: true, user: { select: { name: true } } },
    });
    const names = await this.customerNames(auth, jobs.map((j) => j.customerId));
    const job = new Map(jobs.map((j) => [j.id, j]));
    const who = new Map(members.map((m) => [m.id, m.user.name]));
    return rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      jobNumber: job.get(r.jobId)?.jobNumber ?? null,
      customerName: names.get(job.get(r.jobId)?.customerId ?? '') ?? '',
      collectedBy: who.get(r.collectedByMemberId) ?? '',
      amount: r.amount,
      mode: r.mode,
      status: r.status,
      rejectReason: r.rejectReason,
      paymentId: r.paymentId,
      at: r.createdAt,
    }));
  }

  /** Owner got the money: CONFIRMED, and (by default) a payment on the job's issued bill if it fits. */
  async confirmCash(auth: AuthContext, id: string, addToBill: boolean) {
    await this.prisma.$transaction(async (tx) => {
      const c = await this.claimCash(tx, auth, id, {
        status: 'CONFIRMED',
        confirmedByMemberId: auth.memberId as string,
        confirmedAt: new Date(),
      });
      if (!addToBill) return;
      const bill = await tx.invoice.findFirst({
        where: scoped(auth, { billForJobId: c.jobId, status: 'ISSUED' as const }),
        select: { id: true },
      });
      if (bill) await this.payFromCollection(tx, auth, bill.id, c);
    });
    return (await this.cashView(auth, id))!;
  }

  /** Owner did not get it: REJECTED with the reason; it never becomes a payment. */
  async rejectCash(auth: AuthContext, id: string, reason: string) {
    await this.prisma.$transaction((tx) => this.claimCash(tx, auth, id, { status: 'REJECTED', rejectReason: reason }));
    return (await this.cashView(auth, id))!;
  }

  // ---------- Helpers ----------

  /** Runs a bill-creating transaction; a parallel bill for the same job comes back as JOB_ALREADY_BILLED. */
  private async run(fn: (tx: Prisma.TransactionClient) => Promise<string>, jobId?: string) {
    try {
      return await this.prisma.$transaction(fn);
    } catch (e) {
      if (!jobId || !isUniqueViolation(e)) throw e;
      const live = await this.prisma.invoice.findFirst({ where: { billForJobId: jobId }, select: { id: true } });
      throw this.alreadyBilled(live?.id ?? null);
    }
  }

  private async insert(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    kind: InvoiceKind,
    input: {
      customerId: string;
      siteId?: string | null;
      jobId: string | null;
      gstBill?: boolean;
      discount: number;
      billDate?: string;
      items: ItemInput[];
      fromQuotationId?: string;
    },
  ) {
    const organizationId = requireOrg(auth);
    const customer = await tx.customer.findFirst({ where: scoped(auth, { id: input.customerId }) });
    if (!customer || customer.archivedAt) throw AppError.notFound('CUSTOMER_NOT_FOUND');
    if (input.siteId) await this.checkSite(tx, auth, customer.id, input.siteId);
    const org = await tx.organization.update({
      where: { id: organizationId },
      data: kind === 'BILL' ? { nextBillNumber: { increment: 1 } } : { nextQuoteNumber: { increment: 1 } },
      select: { nextBillNumber: true, nextQuoteNumber: true, gstBills: true },
    });
    const inv = await tx.invoice.create({
      data: {
        organizationId,
        kind,
        number: (kind === 'BILL' ? org.nextBillNumber : org.nextQuoteNumber) - 1,
        customerId: customer.id,
        siteId: input.siteId ?? null,
        jobId: input.jobId,
        billForJobId: input.jobId,
        fromQuotationId: input.fromQuotationId ?? null,
        billDate: toDate(input.billDate ?? todayInIndia()) as Date,
        gstBill: input.gstBill ?? (org.gstBills && customer.gstBills),
        createdByMemberId: auth.memberId as string,
      },
    });
    await this.saveLines(tx, inv, input.items, input.discount, inv.gstBill);
    return inv.id;
  }

  /** Replaces the lines and saves the totals the server worked out. */
  private async saveLines(tx: Prisma.TransactionClient, inv: Invoice, items: ItemInput[], discount: number, gstBill: boolean) {
    const lines = items.map((i) => ({ ...i, gstRate: gstBill ? i.gstRate : 0 }));
    const totals = billTotals(lines, discount, gstBill);
    if (discount > totals.subtotal) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'DISCOUNT_TOO_BIG', 'The discount is more than the items add up to.');
    }
    if (totals.total > 1_000_000_000) {
      throw AppError.validation({ items: 'Bill total is too big' });
    }
    await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } });
    await tx.invoiceItem.createMany({
      data: lines.map((l, position) => ({
        organizationId: inv.organizationId,
        invoiceId: inv.id,
        position,
        description: l.description,
        qty: l.qty,
        unitPrice: l.unitPrice,
        gstRate: l.gstRate,
        ...totals.lines[position],
      })),
    });
    await tx.invoice.update({
      where: { id: inv.id },
      data: { gstBill, discount: totals.discount, subtotal: totals.subtotal, taxTotal: totals.taxTotal, total: totals.total },
    });
  }

  private jobLines(job: { type: JobType; amountToCollect: number | null; report: { parts: Prisma.JsonValue } | null }, gstBill: boolean) {
    const rate = gstBill ? DEFAULT_GST_RATE : 0;
    const parts = Array.isArray(job.report?.parts) ? (job.report.parts as { name?: unknown; qty?: unknown }[]) : [];
    return [
      { source: 'SERVICE' as const, description: JOB_LINE[job.type], qty: 1, unitPrice: job.amountToCollect ?? 0, gstRate: rate },
      ...parts
        .filter((p) => typeof p.name === 'string' && p.name.trim())
        .map((p) => ({
          source: 'PART' as const,
          description: (p.name as string).trim().slice(0, 120),
          qty: typeof p.qty === 'number' && p.qty >= 1 ? Math.min(Math.floor(p.qty), 999) : 1,
          unitPrice: 0,
          gstRate: rate,
        })),
    ];
  }

  private async completedJob(db: Prisma.TransactionClient, auth: AuthContext, jobId: string) {
    const job = await db.serviceJob.findFirst({ where: scoped(auth, { id: jobId }), include: { report: true } });
    if (!job) throw AppError.notFound('JOB_NOT_FOUND');
    if (job.status !== 'COMPLETED') {
      throw new AppError(HttpStatus.CONFLICT, 'JOB_NOT_COMPLETED', 'Make the bill after the job is finished.');
    }
    return job;
  }

  private async gstDefault(tx: Prisma.TransactionClient, auth: AuthContext, customerId: string) {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: requireOrg(auth) }, select: { gstBills: true } });
    const c = await tx.customer.findFirst({ where: scoped(auth, { id: customerId }), select: { gstBills: true } });
    return org.gstBills && !!c?.gstBills;
  }

  private async gstins(tx: Prisma.TransactionClient, auth: AuthContext, customerId: string) {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: requireOrg(auth) }, select: { gstin: true } });
    const c = await tx.customer.findFirst({ where: scoped(auth, { id: customerId }), select: { gstin: true } });
    return { seller: org.gstin, buyer: c?.gstin ?? null };
  }

  private async checkSite(tx: Prisma.TransactionClient, auth: AuthContext, customerId: string, siteId: string) {
    const site = await tx.site.findFirst({ where: scoped(auth, { id: siteId, customerId }) });
    if (!site) throw AppError.notFound('SITE_NOT_FOUND');
  }

  /** Reads the bill with a row lock so payments on one bill go one at a time. */
  private async lock(tx: Prisma.TransactionClient, auth: AuthContext, kind: InvoiceKind, id: string) {
    const organizationId = requireOrg(auth);
    await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
    const inv = await tx.invoice.findFirst({ where: scoped(auth, { id, kind }) });
    if (!inv) throw this.notFound(kind);
    return inv;
  }

  /** A confirmed team collection becomes a payment on the bill, when it fits in what is left. */
  private async payFromCollection(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    billId: string,
    c: { id: string; amount: number; mode: 'CASH' | 'UPI'; createdAt: Date },
  ) {
    const bill = await this.lock(tx, auth, 'BILL', billId);
    if (c.amount > bill.total - bill.paid) return;
    const p = await tx.payment.create({
      data: {
        organizationId: bill.organizationId,
        invoiceId: bill.id,
        customerId: bill.customerId,
        amount: c.amount,
        mode: c.mode,
        receivedAt: toDate(fromDate(c.createdAt)) as Date,
        idempotencyKey: `cash:${c.id}`,
        recordedByMemberId: auth.memberId as string,
      },
    });
    await tx.invoice.update({ where: { id: bill.id }, data: { paid: { increment: c.amount } } });
    await tx.cashCollection.update({ where: { id: c.id }, data: { paymentId: p.id } });
  }

  private async claimCash(tx: Prisma.TransactionClient, auth: AuthContext, id: string, data: Prisma.CashCollectionUpdateManyMutationInput) {
    const c = await tx.cashCollection.findFirst({ where: scoped(auth, { id }) });
    if (!c) throw AppError.notFound('CASH_NOT_FOUND');
    const done = await tx.cashCollection.updateMany({ where: { id, status: 'WITH_TEAM' }, data });
    if (done.count === 0) {
      throw new AppError(HttpStatus.CONFLICT, 'INVALID_STATUS_TRANSITION', 'This money was already marked.');
    }
    return c;
  }

  private async cashView(auth: AuthContext, id: string) {
    const c = await this.prisma.cashCollection.findFirst({ where: scoped(auth, { id }) });
    if (!c) return null;
    return (await this.listCash(auth, c.status)).find((x) => x.id === id) ?? null;
  }

  /** Same key, same bill and amount → the saved payment; anything else is a reused key. */
  private replay(p: Prisma.PaymentGetPayload<object>, billId: string, input: PaymentInput) {
    if (p.invoiceId !== billId || p.amount !== input.amount) {
      throw new AppError(HttpStatus.CONFLICT, 'IDEMPOTENCY_KEY_REUSED', 'This payment was already saved with other details.');
    }
    return this.paymentView(p);
  }

  private paymentView(p: Prisma.PaymentGetPayload<object>) {
    return {
      id: p.id,
      billId: p.invoiceId,
      amount: p.amount,
      mode: p.mode,
      receivedAt: fromDate(p.receivedAt),
      note: p.note,
      fromTeam: p.idempotencyKey.startsWith('cash:'),
      voidedAt: p.voidedAt,
      voidReason: p.voidReason,
      createdAt: p.createdAt,
    };
  }

  private async find(auth: AuthContext, kind: InvoiceKind, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: scoped(auth, { id, kind }) });
    if (!inv) throw this.notFound(kind);
    return inv;
  }

  private notFound(kind: InvoiceKind) {
    return AppError.notFound(kind === 'BILL' ? 'BILL_NOT_FOUND' : 'QUOTATION_NOT_FOUND');
  }

  private alreadyBilled(billId: string | null) {
    return new AppError(HttpStatus.CONFLICT, 'JOB_ALREADY_BILLED', 'This job already has a bill.', { billId });
  }

  private invalid(status: InvoiceStatus) {
    return new AppError(
      HttpStatus.CONFLICT,
      'INVALID_STATUS_TRANSITION',
      `Not possible while it is ${status.toLowerCase()}.`,
    );
  }

  private async customerNames(auth: AuthContext, ids: string[]) {
    const rows = await this.prisma.customer.findMany({
      where: scoped(auth, { id: { in: [...new Set(ids)] } }),
      select: { id: true, name: true },
    });
    return new Map(rows.map((c) => [c.id, c.name]));
  }

  /** List row: label, customer name, job number, paid state and what is left. */
  private async decorate(auth: AuthContext, rows: Invoice[]) {
    const names = await this.customerNames(auth, rows.map((r) => r.customerId));
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { id: { in: rows.map((r) => r.jobId).filter((x): x is string => !!x) } }),
      select: { id: true, jobNumber: true },
    });
    const job = new Map(jobs.map((j) => [j.id, j.jobNumber]));
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      number: billLabel(r.kind, r.number),
      status: r.status,
      payState: r.kind === 'BILL' && r.status === 'ISSUED' ? payState(r.total, r.paid) : null,
      customerId: r.customerId,
      customerName: names.get(r.customerId) ?? '',
      billDate: fromDate(r.billDate),
      gstBill: r.gstBill,
      total: r.total,
      paid: r.paid,
      remaining: r.status === 'ISSUED' && r.kind === 'BILL' ? remaining(r.total, r.paid) : 0,
      jobId: r.jobId,
      jobNumber: r.jobId ? (job.get(r.jobId) ?? null) : null,
    }));
  }
}
