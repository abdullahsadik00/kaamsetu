import { createHash } from 'node:crypto';
import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { JobStatus } from '../generated/prisma/client.js';
import { nextStatus, type JobAction } from '../jobs/jobs.state.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';

// ---------- Contracts (docs/09 §5–6) ----------

const OperationSchema = z.strictObject({
  /** Phone-generated UUID; also the idempotency key. */
  id: z.uuid(),
  operation: z.enum(['job.start', 'job.hold', 'job.complete']),
  entityType: z.literal('ServiceJob'),
  entityId: z.uuid(),
  payload: z.record(z.string(), z.unknown()).nullable().default({}),
  baseVersion: z.number().int().nullable().optional(),
  dependsOn: z.uuid().nullable().optional(),
  createdAt: z.string().max(40),
});
type Operation = z.infer<typeof OperationSchema>;

export const OperationsBatchSchema = z.strictObject({
  operations: z.array(OperationSchema).min(1).max(50),
});
type OperationsBatch = z.infer<typeof OperationsBatchSchema>;

const HoldPayload = z.object({
  side: z.enum(['CUSTOMER', 'OURS']).optional(),
  reason: z.string().max(200).optional(),
});
/** What was done to one AC on the finish page (T4.8). */
export const WORK_CODES = ['CLEANED', 'GAS_FILLED', 'REPAIRED', 'PART_CHANGED', 'INSTALLED', 'CHECKED'] as const;
const CompletePayload = z
  .object({
    outcome: z.enum(['COMPLETED', 'NEEDS_FOLLOW_UP', 'NOT_COMPLETED']).default('COMPLETED'),
    note: z.string().trim().max(500).optional(),
    work: z
      .array(
        z.object({
          equipmentId: z.uuid(),
          work: z.array(z.enum(WORK_CODES)).max(WORK_CODES.length),
          note: z.string().trim().max(200).optional(),
        }),
      )
      .max(30)
      .default([]),
    parts: z
      .array(z.object({ name: z.string().trim().min(1).max(60), qty: z.number().int().min(1).max(99) }))
      .max(30)
      .default([]),
    /** Money taken from the customer, paise (D-008). */
    collected: z
      .object({ amount: z.number().int().min(1).max(100_000_000), mode: z.enum(['CASH', 'UPI']) })
      .optional(),
  })
  // "Couldn't do it" needs a reason (T4.8 validation).
  .refine((p) => p.outcome !== 'NOT_COMPLETED' || !!p.note, { path: ['note'] });

type Result = { id: string; status: 'applied' | 'duplicate' | 'conflict' | 'rejected'; code?: string };

const ACTION: Record<Operation['operation'], JobAction> = {
  'job.start': 'start',
  'job.hold': 'hold',
  'job.complete': 'complete',
};

const MyJobsQuery = z.strictObject({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/**
 * Field staff's view of jobs and their offline operations (T4.7, D-031).
 * Access is always "jobs assigned to a team I am in now" (docs/10 §3).
 */
@Injectable()
export class FieldService {
  constructor(private readonly prisma: PrismaService) {}

  private async myTeamIds(auth: AuthContext): Promise<string[]> {
    const rows = await this.prisma.teamMember.findMany({
      where: { organizationMemberId: auth.memberId as string, leftAt: null, team: { active: true } },
      select: { teamId: true },
    });
    return rows.map((r) => r.teamId);
  }

  /** Open jobs of my teams (plus today's finished ones), slimmer for helpers (Q-01). */
  async myJobs(auth: AuthContext, date?: string) {
    const teamIds = await this.myTeamIds(auth);
    const helper = auth.role === 'HELPER';
    const day = date ? new Date(`${date}T00:00:00.000Z`) : undefined;
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, {
        assignedTeamId: { in: teamIds },
        ...(day
          ? { scheduledDate: day, status: { not: 'CANCELLED' as JobStatus } }
          : { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] as JobStatus[] } }),
      }),
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }, { jobNumber: 'asc' }],
      take: 50,
      include: { equipment: { select: { equipmentId: true } } },
    });
    const customers = await this.prisma.customer.findMany({
      where: scoped(auth, { id: { in: jobs.map((j) => j.customerId) } }),
      select: { id: true, name: true, phone: true },
    });
    const sites = await this.prisma.site.findMany({
      where: scoped(auth, { id: { in: jobs.map((j) => j.siteId) } }),
    });
    const acs = await this.prisma.equipment.findMany({
      where: scoped(auth, { id: { in: jobs.flatMap((j) => j.equipment.map((e) => e.equipmentId)) } }),
      select: { id: true, type: true, brand: true, capacityTons: true, locationLabel: true },
    });
    const seniors = await this.prisma.teamMember.findMany({
      where: { teamId: { in: teamIds }, leftAt: null, isPrimary: true },
      select: { teamId: true, member: { select: { user: { select: { name: true, phone: true } } } } },
    });
    const c = new Map(customers.map((x) => [x.id, x]));
    const s = new Map(sites.map((x) => [x.id, x]));
    const a = new Map(acs.map((x) => [x.id, { ...x, capacityTons: x.capacityTons === null ? null : Number(x.capacityTons) }]));
    const lead = new Map(seniors.map((x) => [x.teamId, x.member.user]));
    return jobs.map((j) => {
      const site = s.get(j.siteId);
      const base = {
        id: j.id,
        jobNumber: j.jobNumber,
        type: j.type,
        status: j.status,
        version: j.version,
        scheduledDate: j.scheduledDate?.toISOString().slice(0, 10) ?? null,
        timeSlot: j.timeSlot,
        customer: c.get(j.customerId) ?? null,
        locality: site?.locality ?? site?.city ?? null,
        senior: j.assignedTeamId ? (lead.get(j.assignedTeamId) ?? null) : null,
      };
      if (helper) return base;
      return {
        ...base,
        address: site ? [site.addressLine1, site.locality, site.city].filter(Boolean).join(', ') : null,
        landmark: site?.landmark ?? null,
        complaint: j.complaint,
        amountToCollect: j.amountToCollect,
        equipment: j.equipment.map((e) => a.get(e.equipmentId)).filter(Boolean),
      };
    });
  }

  /**
   * Applies a batch in order. Each operation answers on its own (partial
   * success is normal): same id + same content = duplicate, same id +
   * different content = rejected, invalid move = conflict.
   */
  async apply(auth: AuthContext, batch: OperationsBatch): Promise<{ results: Result[] }> {
    const results: Result[] = [];
    const sent = new Map<string, Result>();
    for (const op of batch.operations) {
      const r =
        op.dependsOn && sent.get(op.dependsOn) && !['applied', 'duplicate'].includes(sent.get(op.dependsOn)!.status)
          ? { id: op.id, status: 'rejected' as const, code: 'DEPENDENCY_FAILED' }
          : await this.applyOne(auth, op);
      sent.set(op.id, r);
      results.push(r);
    }
    return { results };
  }

  private async applyOne(auth: AuthContext, op: Operation): Promise<Result> {
    const organizationId = requireOrg(auth);
    const hash = createHash('sha256')
      .update(JSON.stringify({ o: op.operation, e: op.entityId, p: op.payload ?? {} }))
      .digest('hex');
    const seen = await this.prisma.syncOperation.findUnique({ where: { id: op.id } });
    if (seen) {
      return seen.organizationId === organizationId && seen.payloadHash === hash
        ? { id: op.id, status: 'duplicate' }
        : { id: op.id, status: 'rejected', code: 'OPERATION_ID_REUSED' };
    }

    const result = await this.decide(auth, op);
    await this.prisma.syncOperation.create({
      data: {
        id: op.id,
        organizationId,
        memberId: auth.memberId as string,
        operation: op.operation,
        entityId: op.entityId,
        payloadHash: hash,
        result: result.status,
        errorCode: result.code ?? null,
      },
    });
    return result;
  }

  private async decide(auth: AuthContext, op: Operation): Promise<Result> {
    if (auth.role !== 'SENIOR_TECHNICIAN') {
      return { id: op.id, status: 'rejected', code: 'FORBIDDEN_ROLE' };
    }
    const teamIds = await this.myTeamIds(auth);
    const job = await this.prisma.serviceJob.findFirst({
      where: scoped(auth, { id: op.entityId, assignedTeamId: { in: teamIds } }),
    });
    // Not found, another business, or no longer my team's job: the same answer (docs/10 §3).
    if (!job) return { id: op.id, status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' };

    const to = nextStatus(job.status, ACTION[op.operation]);
    // e.g. the owner cancelled meanwhile (docs/09 §7): the field work is not lost on the
    // phone; the full report is kept with T4.8.
    if (!to) return { id: op.id, status: 'conflict', code: 'INVALID_STATUS_TRANSITION' };

    let note: string | null = null;
    let report: z.infer<typeof CompletePayload> | null = null;
    if (op.operation === 'job.hold') {
      const p = HoldPayload.safeParse(op.payload ?? {});
      if (!p.success) return { id: op.id, status: 'rejected', code: 'VALIDATION_FAILED' };
      note = [p.data.side === 'CUSTOMER' ? 'Customer side' : p.data.side === 'OURS' ? 'Our side' : null, p.data.reason]
        .filter(Boolean)
        .join(': ') || null;
    }
    if (op.operation === 'job.complete') {
      const p = CompletePayload.safeParse(op.payload ?? {});
      if (!p.success) return { id: op.id, status: 'rejected', code: 'VALIDATION_FAILED' };
      const onJob = new Set(
        (await this.prisma.jobEquipment.findMany({ where: { jobId: job.id }, select: { equipmentId: true } })).map(
          (e) => e.equipmentId,
        ),
      );
      if (p.data.work.some((w) => !onJob.has(w.equipmentId))) {
        return { id: op.id, status: 'rejected', code: 'EQUIPMENT_NOT_ON_JOB' };
      }
      report = p.data;
      note = [p.data.outcome, p.data.note].filter(Boolean).join(': ') || null;
    }

    await this.prisma.$transaction([
      this.prisma.serviceJob.update({
        where: { id: job.id },
        data: {
          status: to,
          version: { increment: 1 },
          ...(to === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      }),
      this.prisma.jobStatusHistory.create({
        data: {
          organizationId: job.organizationId,
          jobId: job.id,
          fromStatus: job.status,
          toStatus: to,
          byMemberId: auth.memberId as string,
          note,
        },
      }),
      ...(report
        ? [
            this.prisma.serviceReport.create({
              data: {
                id: op.id,
                organizationId: job.organizationId,
                jobId: job.id,
                byMemberId: auth.memberId as string,
                outcome: report.outcome,
                note: report.note || null,
                work: report.work,
                parts: report.parts,
              },
            }),
          ]
        : []),
      ...(report?.collected
        ? [
            this.prisma.cashCollection.create({
              data: {
                id: op.id,
                organizationId: job.organizationId,
                jobId: job.id,
                collectedByMemberId: auth.memberId as string,
                amount: report.collected.amount,
                mode: report.collected.mode,
              },
            }),
          ]
        : []),
    ]);
    return { id: op.id, status: 'applied' };
  }
}

@Controller()
export class FieldController {
  constructor(private readonly field: FieldService) {}

  @Roles('SENIOR_TECHNICIAN', 'HELPER')
  @Get('my/jobs')
  myJobs(
    @CurrentAuth() auth: AuthContext,
    @Query(new ZodValidationPipe(MyJobsQuery)) q: { date?: string },
  ) {
    return this.field.myJobs(auth, q.date);
  }

  /** The phone outbox's endpoint (docs/09 §6). */
  @Roles('SENIOR_TECHNICIAN', 'HELPER', 'OWNER')
  @Post('sync/operations')
  @HttpCode(HttpStatus.OK)
  operations(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(OperationsBatchSchema)) body: OperationsBatch,
  ) {
    return this.field.apply(auth, body);
  }
}

@Module({ controllers: [FieldController], providers: [FieldService] })
export class FieldModule {}
