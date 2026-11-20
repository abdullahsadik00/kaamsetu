import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import type { JobStatus, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { isOpen, nextStatus, type JobAction } from './jobs.state.js';

const JOB_TYPES = ['SERVICE', 'REPAIR', 'INSTALLATION', 'UNINSTALLATION', 'GAS_FILLING', 'OTHER'] as const;
const SLOTS = ['MORNING', 'AFTERNOON', 'EVENING'] as const;
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date as YYYY-MM-DD');
const paise = z.number().int().min(0).max(10_000_000);

export const CreateJobSchema = z.strictObject({
  customerId: z.uuid(),
  siteId: z.uuid(),
  equipmentIds: z.array(z.uuid()).max(20).default([]),
  type: z.enum(JOB_TYPES).default('SERVICE'),
  complaint: z.string().trim().max(500).optional(),
  scheduledDate: day.optional(),
  timeSlot: z.enum(SLOTS).optional(),
  teamId: z.uuid().optional(),
  amountToCollect: paise.optional(),
});
export type CreateJob = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = z.strictObject({
  /** The version the owner saw; a stale edit is refused (VERSION_CONFLICT). */
  version: z.number().int().min(1),
  type: z.enum(JOB_TYPES).optional(),
  complaint: z.string().trim().max(500).nullable().optional(),
  scheduledDate: day.nullable().optional(),
  timeSlot: z.enum(SLOTS).nullable().optional(),
  amountToCollect: paise.nullable().optional(),
});
export type UpdateJob = z.infer<typeof UpdateJobSchema>;

export const ListJobsSchema = z.strictObject({
  status: z.enum(['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'OPEN']).optional(),
  date: day.optional(),
  teamId: z.uuid().optional(),
  customerId: z.uuid().optional(),
});
export type ListJobs = z.infer<typeof ListJobsSchema>;

export const AssignSchema = z.strictObject({ teamId: z.uuid() });
export const CancelSchema = z.strictObject({ reason: z.string().trim().min(2, 'Give a reason').max(200) });

const toDate = (d?: string | null) => (d ? new Date(`${d}T00:00:00.000Z`) : d === null ? null : undefined);
const fromDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const listSelect = {
  id: true,
  jobNumber: true,
  type: true,
  status: true,
  scheduledDate: true,
  timeSlot: true,
  amountToCollect: true,
  assignedTeamId: true,
  customerId: true,
  siteId: true,
  _count: { select: { equipment: true } },
} satisfies Prisma.ServiceJobSelect;

/** Jobs, owner side (T4.6, D-030). Every query is scoped to the business. */
@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(auth: AuthContext, q: ListJobs) {
    const where: Prisma.ServiceJobWhereInput = {
      ...(q.status === 'OPEN'
        ? { status: { in: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] } }
        : q.status
          ? { status: q.status }
          : {}),
      ...(q.date ? { scheduledDate: toDate(q.date) } : {}),
      ...(q.teamId ? { assignedTeamId: q.teamId } : {}),
      ...(q.customerId ? { customerId: q.customerId } : {}),
    };
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, where),
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }, { jobNumber: 'asc' }],
      take: 100,
      select: listSelect,
    });
    return this.decorate(auth, jobs);
  }

  async get(auth: AuthContext, id: string) {
    const job = await this.prisma.serviceJob.findFirst({
      where: scoped(auth, { id }),
      include: {
        equipment: { select: { equipmentId: true } },
        assignments: { orderBy: { assignedAt: 'asc' } },
        history: { orderBy: { at: 'asc' } },
      },
    });
    if (!job) throw AppError.notFound('JOB_NOT_FOUND');
    const [row] = await this.decorate(auth, [{ ...job, _count: { equipment: job.equipment.length } }]);
    const ids = job.equipment.map((e) => e.equipmentId);
    const equipment = await this.prisma.equipment.findMany({
      where: scoped(auth, { id: { in: ids } }),
      select: { id: true, type: true, brand: true, capacityTons: true, locationLabel: true },
    });
    const site = await this.prisma.site.findFirst({ where: scoped(auth, { id: job.siteId }) });
    const customer = await this.prisma.customer.findFirst({
      where: scoped(auth, { id: job.customerId }),
      select: { id: true, name: true, phone: true },
    });
    return {
      ...row,
      complaint: job.complaint,
      cancelReason: job.cancelReason,
      followUpOfJobId: job.followUpOfJobId,
      version: job.version,
      customer,
      site: site && {
        id: site.id,
        label: site.label,
        addressLine1: site.addressLine1,
        locality: site.locality,
        city: site.city,
        landmark: site.landmark,
      },
      equipment: equipment.map((e) => ({
        ...e,
        capacityTons: e.capacityTons === null ? null : Number(e.capacityTons),
      })),
      history: job.history.map((h) => ({ from: h.fromStatus, to: h.toStatus, note: h.note, at: h.at })),
      assignments: job.assignments.map((a) => ({
        teamId: a.teamId,
        assignedAt: a.assignedAt,
        unassignedAt: a.unassignedAt,
      })),
    };
  }

  /** Creates a job with the next job number; optionally assigns a team straight away. */
  async create(auth: AuthContext, input: CreateJob) {
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
      if (input.teamId) await this.activeTeam(tx, auth, input.teamId);
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: { nextJobNumber: { increment: 1 } },
        select: { nextJobNumber: true },
      });
      const job = await tx.serviceJob.create({
        data: {
          organizationId,
          jobNumber: org.nextJobNumber - 1,
          customerId: input.customerId,
          siteId: site.id,
          type: input.type,
          complaint: input.complaint || null,
          scheduledDate: toDate(input.scheduledDate) ?? null,
          timeSlot: input.timeSlot ?? null,
          amountToCollect: input.amountToCollect ?? null,
          createdByMemberId: memberId,
          status: input.teamId ? 'ASSIGNED' : 'NEW',
          assignedTeamId: input.teamId ?? null,
          equipment: { create: [...acs].map((equipmentId) => ({ organizationId, equipmentId })) },
          history: {
            create: [
              { organizationId, toStatus: 'NEW', byMemberId: memberId },
              ...(input.teamId
                ? [{ organizationId, fromStatus: 'NEW' as const, toStatus: 'ASSIGNED' as const, byMemberId: memberId }]
                : []),
            ],
          },
          ...(input.teamId
            ? { assignments: { create: { organizationId, teamId: input.teamId, assignedByMemberId: memberId } } }
            : {}),
        },
      });
      return job.id;
    });
    return this.get(auth, id);
  }

  /** Edits details (not status). Refuses closed jobs and stale versions. */
  async update(auth: AuthContext, id: string, input: UpdateJob) {
    const { version, scheduledDate, ...rest } = input;
    const job = await this.find(auth, id);
    if (!isOpen(job.status)) throw this.invalid(job.status);
    const result = await this.prisma.serviceJob.updateMany({
      where: scoped(auth, { id, version }),
      data: {
        ...rest,
        ...(scheduledDate !== undefined ? { scheduledDate: toDate(scheduledDate) } : {}),
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'VERSION_CONFLICT',
        'This job was changed in the meantime. Here is the latest version.',
      );
    }
    return this.get(auth, id);
  }

  /** Gives the job to a team, or moves it to another; history is kept. */
  async assign(auth: AuthContext, id: string, teamId: string) {
    const memberId = auth.memberId as string;
    await this.prisma.$transaction(async (tx) => {
      const job = await tx.serviceJob.findFirst({ where: scoped(auth, { id }) });
      if (!job) throw AppError.notFound('JOB_NOT_FOUND');
      const to = this.move(job.status, 'assign');
      await this.activeTeam(tx, auth, teamId);
      if (job.assignedTeamId === teamId) return;
      const now = new Date();
      await tx.jobAssignment.updateMany({
        where: { jobId: id, unassignedAt: null },
        data: { unassignedAt: now },
      });
      await tx.jobAssignment.create({
        data: { organizationId: job.organizationId, jobId: id, teamId, assignedByMemberId: memberId },
      });
      await tx.serviceJob.update({
        where: { id },
        data: { assignedTeamId: teamId, status: to, version: { increment: 1 } },
      });
      await tx.jobStatusHistory.create({
        data: {
          organizationId: job.organizationId,
          jobId: id,
          fromStatus: job.status,
          toStatus: to,
          byMemberId: memberId,
          note: job.assignedTeamId ? 'Team changed' : null,
        },
      });
    });
    return this.get(auth, id);
  }

  async cancel(auth: AuthContext, id: string, reason: string) {
    const memberId = auth.memberId as string;
    const job = await this.find(auth, id);
    const to = this.move(job.status, 'cancel');
    await this.prisma.$transaction([
      this.prisma.serviceJob.update({
        where: { id },
        data: { status: to, cancelReason: reason, version: { increment: 1 } },
      }),
      this.prisma.jobAssignment.updateMany({
        where: { jobId: id, unassignedAt: null },
        data: { unassignedAt: new Date() },
      }),
      this.prisma.jobStatusHistory.create({
        data: { organizationId: job.organizationId, jobId: id, fromStatus: job.status, toStatus: to, byMemberId: memberId, note: reason },
      }),
    ]);
    return this.get(auth, id);
  }

  /** A new visit for the same customer, address and ACs, linked to this job. */
  async followUp(auth: AuthContext, id: string) {
    const job = await this.prisma.serviceJob.findFirst({
      where: scoped(auth, { id }),
      include: { equipment: true },
    });
    if (!job) throw AppError.notFound('JOB_NOT_FOUND');
    const created = await this.create(auth, {
      customerId: job.customerId,
      siteId: job.siteId,
      equipmentIds: job.equipment.map((e) => e.equipmentId),
      type: job.type,
      complaint: job.complaint ?? undefined,
    });
    await this.prisma.serviceJob.update({ where: { id: created.id }, data: { followUpOfJobId: job.id } });
    return this.get(auth, created.id);
  }

  private async find(auth: AuthContext, id: string) {
    const job = await this.prisma.serviceJob.findFirst({ where: scoped(auth, { id }) });
    if (!job) throw AppError.notFound('JOB_NOT_FOUND');
    return job;
  }

  private move(status: JobStatus, action: JobAction): JobStatus {
    const to = nextStatus(status, action);
    if (!to) throw this.invalid(status);
    return to;
  }

  private invalid(status: JobStatus) {
    return new AppError(
      HttpStatus.CONFLICT,
      'INVALID_STATUS_TRANSITION',
      `Not possible while the job is ${status.toLowerCase().replace('_', ' ')}.`,
    );
  }

  private async activeTeam(tx: Prisma.TransactionClient, auth: AuthContext, teamId: string) {
    const team = await tx.team.findFirst({ where: scoped(auth, { id: teamId, active: true }) });
    if (!team) throw AppError.notFound('TEAM_NOT_FOUND');
  }

  /** Adds customer name, locality and team name to job rows. */
  private async decorate(
    auth: AuthContext,
    jobs: Prisma.ServiceJobGetPayload<{ select: typeof listSelect }>[],
  ) {
    const customers = await this.prisma.customer.findMany({
      where: scoped(auth, { id: { in: [...new Set(jobs.map((j) => j.customerId))] } }),
      select: { id: true, name: true },
    });
    const sites = await this.prisma.site.findMany({
      where: scoped(auth, { id: { in: [...new Set(jobs.map((j) => j.siteId))] } }),
      select: { id: true, locality: true, city: true, addressLine1: true },
    });
    const teamIds = [...new Set(jobs.map((j) => j.assignedTeamId).filter((t): t is string => !!t))];
    const teams = await this.prisma.team.findMany({
      where: scoped(auth, { id: { in: teamIds } }),
      select: { id: true, name: true },
    });
    const name = new Map(customers.map((c) => [c.id, c.name]));
    const place = new Map(sites.map((s) => [s.id, s.locality || s.city || s.addressLine1]));
    const team = new Map(teams.map((t) => [t.id, t.name]));
    return jobs.map((j) => ({
      id: j.id,
      jobNumber: j.jobNumber,
      type: j.type,
      status: j.status,
      scheduledDate: fromDate(j.scheduledDate),
      timeSlot: j.timeSlot,
      amountToCollect: j.amountToCollect,
      customerId: j.customerId,
      customerName: name.get(j.customerId) ?? '',
      place: place.get(j.siteId) ?? null,
      teamId: j.assignedTeamId,
      teamName: j.assignedTeamId ? (team.get(j.assignedTeamId) ?? null) : null,
      acCount: j._count.equipment,
    }));
  }
}
