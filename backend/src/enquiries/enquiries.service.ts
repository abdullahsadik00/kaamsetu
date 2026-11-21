import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import type { EnquiryStatus, Prisma } from '../generated/prisma/client.js';
import { JOB_TYPES, JobsService, SLOTS, day, fromDate, paise, toDate } from '../jobs/jobs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';

const SOURCES = ['WHATSAPP', 'PHONE', 'WALK_IN', 'SERVICE_CENTRE', 'B2B', 'OTHER'] as const;

export const CreateEnquirySchema = z.strictObject({
  customerId: z.uuid(),
  siteId: z.uuid(),
  equipmentIds: z.array(z.uuid()).max(20).default([]),
  source: z.enum(SOURCES).default('WHATSAPP'),
  type: z.enum(JOB_TYPES).default('SERVICE'),
  complaint: z.string().trim().max(500).optional(),
  preferredDate: day.optional(),
  preferredSlot: z.enum(SLOTS).optional(),
});
export type CreateEnquiry = z.infer<typeof CreateEnquirySchema>;

export const UpdateEnquirySchema = z.strictObject({
  /** The version the owner saw; a stale edit is refused (VERSION_CONFLICT). */
  version: z.number().int().min(1),
  source: z.enum(SOURCES).optional(),
  type: z.enum(JOB_TYPES).optional(),
  complaint: z.string().trim().max(500).nullable().optional(),
  preferredDate: day.nullable().optional(),
  preferredSlot: z.enum(SLOTS).nullable().optional(),
});
export type UpdateEnquiry = z.infer<typeof UpdateEnquirySchema>;

/** CLOSED lists both closed and converted enquiries (the "Closed" chip). */
export const ListEnquiriesSchema = z.strictObject({ status: z.enum(['OPEN', 'CLOSED']).default('OPEN') });
export type ListEnquiries = z.infer<typeof ListEnquiriesSchema>;

/** What the owner can still decide when converting; the rest is copied from the enquiry. */
export const ConvertSchema = z.strictObject({
  scheduledDate: day.nullable().optional(),
  timeSlot: z.enum(SLOTS).nullable().optional(),
  teamId: z.uuid().optional(),
  amountToCollect: paise.optional(),
});
export type Convert = z.infer<typeof ConvertSchema>;

export const CloseSchema = z.strictObject({ reason: z.string().trim().min(2, 'Give a reason').max(200) });

const listSelect = {
  id: true,
  requestNumber: true,
  status: true,
  source: true,
  type: true,
  complaint: true,
  preferredDate: true,
  preferredSlot: true,
  customerId: true,
  siteId: true,
  createdAt: true,
  _count: { select: { equipment: true } },
} satisfies Prisma.ServiceRequestSelect;

/** Enquiries, owner side (docs/06 §5a, T4.5, D-033). Every query is scoped to the business. */
@Injectable()
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  async list(auth: AuthContext, q: ListEnquiries) {
    const status: EnquiryStatus[] = q.status === 'OPEN' ? ['OPEN'] : ['CONVERTED', 'CLOSED'];
    const rows = await this.prisma.serviceRequest.findMany({
      where: scoped(auth, { status: { in: status } }),
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: listSelect,
    });
    return this.decorate(auth, rows);
  }

  async get(auth: AuthContext, id: string) {
    const e = await this.prisma.serviceRequest.findFirst({
      where: scoped(auth, { id }),
      include: { equipment: { select: { equipmentId: true } } },
    });
    if (!e) throw AppError.notFound('ENQUIRY_NOT_FOUND');
    const [row] = await this.decorate(auth, [{ ...e, _count: { equipment: e.equipment.length } }]);
    const equipment = await this.prisma.equipment.findMany({
      where: scoped(auth, { id: { in: e.equipment.map((x) => x.equipmentId) } }),
      select: { id: true, type: true, brand: true, capacityTons: true, locationLabel: true },
    });
    const site = await this.prisma.site.findFirst({ where: scoped(auth, { id: e.siteId }) });
    const customer = await this.prisma.customer.findFirst({
      where: scoped(auth, { id: e.customerId }),
      select: { id: true, name: true, phone: true },
    });
    const job = await this.prisma.serviceJob.findFirst({
      where: scoped(auth, { serviceRequestId: e.id }),
      select: { id: true, jobNumber: true },
    });
    return {
      ...row,
      closeReason: e.closeReason,
      version: e.version,
      customer,
      site: site && {
        id: site.id,
        label: site.label,
        addressLine1: site.addressLine1,
        locality: site.locality,
        city: site.city,
        landmark: site.landmark,
      },
      equipment: equipment.map((x) => ({
        ...x,
        capacityTons: x.capacityTons === null ? null : Number(x.capacityTons),
      })),
      job: job && { id: job.id, number: job.jobNumber },
    };
  }

  /** Saves an enquiry with the next enquiry number. */
  async create(auth: AuthContext, input: CreateEnquiry) {
    const organizationId = requireOrg(auth);
    const memberId = auth.memberId as string;
    const id = await this.prisma.$transaction(async (tx) => {
      const site = await tx.site.findFirst({
        where: scoped(auth, { id: input.siteId, customerId: input.customerId }),
        include: { customer: true },
      });
      if (!site || site.customer.archivedAt) throw AppError.notFound('SITE_NOT_FOUND');
      const acs = new Set(input.equipmentIds);
      if (acs.size) {
        const found = await tx.equipment.count({
          where: scoped(auth, { id: { in: [...acs] }, siteId: site.id, status: 'ACTIVE' as const }),
        });
        if (found !== acs.size) {
          throw new AppError(HttpStatus.BAD_REQUEST, 'EQUIPMENT_NOT_AT_SITE', 'Choose ACs at this address.');
        }
      }
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: { nextRequestNumber: { increment: 1 } },
        select: { nextRequestNumber: true },
      });
      const e = await tx.serviceRequest.create({
        data: {
          organizationId,
          requestNumber: org.nextRequestNumber - 1,
          customerId: input.customerId,
          siteId: site.id,
          source: input.source,
          type: input.type,
          complaint: input.complaint || null,
          preferredDate: toDate(input.preferredDate) ?? null,
          preferredSlot: input.preferredSlot ?? null,
          createdByMemberId: memberId,
          equipment: { create: [...acs].map((equipmentId) => ({ organizationId, equipmentId })) },
        },
      });
      return e.id;
    });
    return this.get(auth, id);
  }

  /** Edits an open enquiry. Refuses stale versions. */
  async update(auth: AuthContext, id: string, input: UpdateEnquiry) {
    const { version, preferredDate, ...rest } = input;
    const e = await this.find(auth, id);
    if (e.status !== 'OPEN') throw this.invalid(e.status);
    const result = await this.prisma.serviceRequest.updateMany({
      where: scoped(auth, { id, version, status: 'OPEN' as const }),
      data: {
        ...rest,
        ...(preferredDate !== undefined ? { preferredDate: toDate(preferredDate) } : {}),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        'This enquiry was changed in the meantime. Here is the latest version.',
      );
    }
    return this.get(auth, id);
  }

  /**
   * Makes a job from the enquiry in one transaction: customer, address, ACs, type,
   * problem and preferred day are copied; the owner may set day, team and amount.
   * Returns the new job.
   */
  async convert(auth: AuthContext, id: string, input: Convert) {
    const jobId = await this.prisma.$transaction(async (tx) => {
      const e = await tx.serviceRequest.findFirst({ where: scoped(auth, { id }), include: { equipment: true } });
      if (!e) throw AppError.notFound('ENQUIRY_NOT_FOUND');
      // Claim it first so two taps (or two phones) make one job.
      const claimed = await tx.serviceRequest.updateMany({
        where: { id, status: 'OPEN' },
        data: { status: 'CONVERTED', version: { increment: 1 } },
      });
      if (claimed.count === 0) throw this.invalid(e.status);
      // ACs removed since the enquiry was saved are left out rather than blocking the job.
      const stillThere = await tx.equipment.findMany({
        where: scoped(auth, {
          id: { in: e.equipment.map((x) => x.equipmentId) },
          siteId: e.siteId,
          status: 'ACTIVE' as const,
        }),
        select: { id: true },
      });
      const scheduledDate = input.scheduledDate !== undefined ? input.scheduledDate : fromDate(e.preferredDate);
      const timeSlot = input.timeSlot !== undefined ? input.timeSlot : e.preferredSlot;
      return this.jobs.createIn(
        tx,
        auth,
        {
          customerId: e.customerId,
          siteId: e.siteId,
          equipmentIds: stillThere.map((x) => x.id),
          type: e.type,
          complaint: e.complaint ?? undefined,
          scheduledDate: scheduledDate ?? undefined,
          timeSlot: scheduledDate ? (timeSlot ?? undefined) : undefined,
          teamId: input.teamId,
          amountToCollect: input.amountToCollect,
        },
        e.id,
      );
    });
    return this.jobs.get(auth, jobId);
  }

  async close(auth: AuthContext, id: string, reason: string) {
    const e = await this.find(auth, id);
    const result = await this.prisma.serviceRequest.updateMany({
      where: scoped(auth, { id, status: 'OPEN' as const }),
      data: { status: 'CLOSED', closeReason: reason, version: { increment: 1 } },
    });
    if (result.count === 0) throw this.invalid(e.status);
    return this.get(auth, id);
  }

  private async find(auth: AuthContext, id: string) {
    const e = await this.prisma.serviceRequest.findFirst({ where: scoped(auth, { id }) });
    if (!e) throw AppError.notFound('ENQUIRY_NOT_FOUND');
    return e;
  }

  private invalid(status: EnquiryStatus) {
    return new AppError(
      HttpStatus.CONFLICT,
      'INVALID_STATUS_TRANSITION',
      `Not possible while the enquiry is ${status.toLowerCase()}.`,
    );
  }

  /** Adds customer name, locality and the job made from it to enquiry rows. */
  private async decorate(
    auth: AuthContext,
    rows: Prisma.ServiceRequestGetPayload<{ select: typeof listSelect }>[],
  ) {
    const customers = await this.prisma.customer.findMany({
      where: scoped(auth, { id: { in: [...new Set(rows.map((r) => r.customerId))] } }),
      select: { id: true, name: true },
    });
    const sites = await this.prisma.site.findMany({
      where: scoped(auth, { id: { in: [...new Set(rows.map((r) => r.siteId))] } }),
      select: { id: true, locality: true, city: true, addressLine1: true },
    });
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { serviceRequestId: { in: rows.map((r) => r.id) } }),
      select: { id: true, jobNumber: true, serviceRequestId: true },
    });
    const name = new Map(customers.map((c) => [c.id, c.name]));
    const place = new Map(sites.map((s) => [s.id, s.locality || s.city || s.addressLine1]));
    const job = new Map(jobs.map((j) => [j.serviceRequestId, { id: j.id, number: j.jobNumber }]));
    return rows.map((r) => ({
      id: r.id,
      number: r.requestNumber,
      status: r.status,
      source: r.source,
      type: r.type,
      complaint: r.complaint,
      preferredDate: fromDate(r.preferredDate),
      preferredSlot: r.preferredSlot,
      customerId: r.customerId,
      customerName: name.get(r.customerId) ?? '',
      siteId: r.siteId,
      place: place.get(r.siteId) ?? null,
      acCount: r._count.equipment,
      createdAt: r.createdAt,
      jobId: job.get(r.id)?.id ?? null,
      jobNumber: job.get(r.id)?.number ?? null,
    }));
  }
}
