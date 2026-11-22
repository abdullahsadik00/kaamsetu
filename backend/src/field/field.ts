import { createHash } from 'node:crypto';
import { Body, Controller, Get, HttpCode, HttpStatus, Injectable, Module, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { JobStatus, JobUpdateType, Prisma } from '../generated/prisma/client.js';
import { SLOTS } from '../jobs/jobs.service.js';
import { isOpen, nextStatus, type JobAction } from '../jobs/jobs.state.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { everTeamIds, fieldScope, myTeamIds, presentJobs, scopeTeamIds, withMyTeam } from './scope.js';
import { SyncController, SyncService } from './sync.js';

// ---------- Contracts (docs/09 §5–6) ----------

/** Field updates that are not status changes (T4.7, docs/09 §7: append-only, never conflict). */
export const UPDATE_OPS = ['job.appointment', 'job.part', 'job.note'] as const;
type UpdateOp = (typeof UPDATE_OPS)[number];
const isUpdateOp = (o: string): o is UpdateOp => (UPDATE_OPS as readonly string[]).includes(o);

const OperationSchema = z.strictObject({
  /** Phone-generated UUID; also the idempotency key. */
  id: z.uuid(),
  operation: z.enum(['job.start', 'job.hold', 'job.complete', ...UPDATE_OPS]),
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

/** Appointment fixed: the day and time slot agreed with the customer; also moves the job's schedule. */
const AppointmentPayload = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slot: z.enum(SLOTS),
});
/** Part needed: recorded for the owner to arrange; the job's status does not change. */
const PartPayload = z.strictObject({
  part: z.string().trim().min(1).max(60),
  qty: z.number().int().min(1).max(99).default(1),
  canContinue: z.boolean().default(true),
  note: z.string().trim().max(200).optional(),
});
const NotePayload = z.strictObject({ text: z.string().trim().min(1).max(500) });

const UPDATE_TYPE: Record<UpdateOp, JobUpdateType> = {
  'job.appointment': 'APPOINTMENT_FIXED',
  'job.part': 'PART_NEEDED',
  'job.note': 'NOTE',
};

type Result = { id: string; status: 'applied' | 'duplicate' | 'conflict' | 'rejected'; code?: string };

const ACTION: Record<Exclude<Operation['operation'], UpdateOp>, JobAction> = {
  'job.start': 'start',
  'job.hold': 'hold',
  'job.complete': 'complete',
};

/** Processed operation ids are kept this long (docs/09 §6: at least 30 days). */
export const OPERATION_RETENTION_DAYS = 30;

const MyJobsQuery = z.strictObject({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/**
 * Field staff's view of jobs and their offline operations (T4.7, D-031).
 * Access is always "jobs assigned to a team I am in now" (docs/10 §3).
 */
@Injectable()
export class FieldService {
  constructor(private readonly prisma: PrismaService) {}


  /**
   * Open jobs of the team I am with on each job's day (a helper lent for a
   * day sees that team's jobs that day, D-038), slimmer for helpers (Q-01).
   */
  async myJobs(auth: AuthContext, date?: string) {
    const scope = await fieldScope(this.prisma, auth);
    const teamIds = scopeTeamIds(scope);
    const day = date ? new Date(`${date}T00:00:00.000Z`) : undefined;
    const jobs = await this.prisma.serviceJob.findMany({
      where: scoped(auth, {
        assignedTeamId: { in: teamIds },
        ...(day
          ? { scheduledDate: day, status: { not: 'CANCELLED' as JobStatus } }
          : { status: { in: ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] as JobStatus[] } }),
      }),
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }, { jobNumber: 'asc' }],
      take: 100,
      include: { equipment: { select: { equipmentId: true } } },
    });
    const mine = jobs.filter((j) => withMyTeam(j, scope)).slice(0, 50);
    return presentJobs(this.prisma, auth, mine, teamIds);
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
      if (seen.organizationId !== organizationId || seen.payloadHash !== hash) {
        return { id: op.id, status: 'rejected', code: 'OPERATION_ID_REUSED' };
      }
      // A repeat gets the stored verdict: applied → duplicate; a refusal stays a refusal.
      return seen.result === 'applied'
        ? { id: op.id, status: 'duplicate' }
        : { id: op.id, status: seen.result as Result['status'], ...(seen.errorCode ? { code: seen.errorCode } : {}) };
    }

    const result = await this.decide(auth, op);
    const refused = result.status === 'conflict' || result.status === 'rejected';
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
        // Field work the server could not apply is kept for the owner to see (docs/09 §7).
        ...(refused ? { payload: (op.payload ?? {}) as Prisma.InputJsonValue } : {}),
      },
    });
    return result;
  }

  /**
   * Retention (docs/09 §6): processed operation ids are kept 30 days to spot
   * repeats, then removed. Not scheduled yet; call it from a job or script.
   */
  async purgeOldOperations(now = new Date(), days = OPERATION_RETENTION_DAYS): Promise<number> {
    const before = new Date(now.getTime() - days * 24 * 3600_000);
    const res = await this.prisma.syncOperation.deleteMany({ where: { receivedAt: { lt: before } } });
    return res.count;
  }

  private async decide(auth: AuthContext, op: Operation): Promise<Result> {
    if (auth.role !== 'SENIOR_TECHNICIAN') {
      return { id: op.id, status: 'rejected', code: 'FORBIDDEN_ROLE' };
    }
    const teamIds = await myTeamIds(this.prisma, auth);
    const job = await this.prisma.serviceJob.findFirst({
      where: scoped(auth, { id: op.entityId, assignedTeamId: { in: teamIds } }),
    });
    if (!job) {
      // Given to another team after this phone saw it (docs/09 §7): a conflict the phone can explain.
      const moved = await this.prisma.jobAssignment.findFirst({
        where: { organizationId: requireOrg(auth), jobId: op.entityId, teamId: { in: await everTeamIds(this.prisma, auth) } },
        select: { id: true },
      });
      // Otherwise not found, another business, or never mine: the same answer (docs/10 §3).
      return moved
        ? { id: op.id, status: 'conflict', code: 'JOB_REASSIGNED' }
        : { id: op.id, status: 'rejected', code: 'JOB_NOT_ACCESSIBLE' };
    }

    if (isUpdateOp(op.operation)) return this.addUpdate(auth, job, op, op.operation);

    // Already started on another phone of the team (docs/09 §10 #8): nothing to do.
    if (op.operation === 'job.start' && job.status === 'IN_PROGRESS') return { id: op.id, status: 'applied' };
    const to = nextStatus(job.status, ACTION[op.operation]);
    // e.g. the owner cancelled meanwhile (docs/09 §7): the phone shows "Needs attention"
    // with the reason, and the operation body is kept on the server for the owner.
    if (!to) {
      const code =
        job.status === 'CANCELLED' ? 'JOB_CANCELLED' : job.status === 'COMPLETED' ? 'JOB_ALREADY_COMPLETED' : 'INVALID_STATUS_TRANSITION';
      return { id: op.id, status: 'conflict', code };
    }

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

  /**
   * Appointment fixed / Part needed / Note (T4.7): appended to the job's
   * update feed. Appointment fixed also sets the job's day and slot while the
   * job is open (the sync trigger then sends the job to the team's phones
   * again); on a closed job it is only recorded.
   */
  private async addUpdate(
    auth: AuthContext,
    job: { id: string; organizationId: string; status: JobStatus },
    op: Operation,
    kind: UpdateOp,
  ): Promise<Result> {
    const schema = kind === 'job.appointment' ? AppointmentPayload : kind === 'job.part' ? PartPayload : NotePayload;
    const p = schema.safeParse(op.payload ?? {});
    if (!p.success) return { id: op.id, status: 'rejected', code: 'VALIDATION_FAILED' };
    const savedAt = new Date(op.createdAt);
    const reschedule = kind === 'job.appointment' && isOpen(job.status);
    const appointment = p.data as z.infer<typeof AppointmentPayload>;
    await this.prisma.$transaction([
      this.prisma.jobUpdate.create({
        data: {
          id: op.id,
          organizationId: job.organizationId,
          jobId: job.id,
          type: UPDATE_TYPE[kind],
          payload: p.data as Prisma.InputJsonValue,
          byMemberId: auth.memberId as string,
          createdAt: Number.isNaN(savedAt.getTime()) ? new Date() : savedAt,
        },
      }),
      ...(reschedule
        ? [
            this.prisma.serviceJob.update({
              where: { id: job.id },
              data: {
                scheduledDate: new Date(`${appointment.date}T00:00:00.000Z`),
                timeSlot: appointment.slot,
                version: { increment: 1 },
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

@Module({ controllers: [FieldController, SyncController], providers: [FieldService, SyncService] })
export class FieldModule {}
