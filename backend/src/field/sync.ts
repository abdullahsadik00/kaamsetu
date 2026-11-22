import { Controller, Get, Injectable, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentAuth } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.js';
import type { AuthContext } from '../auth/token.service.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { dayIn, everTeamIds, FIELD_OPEN, fieldScope, onFieldPhone, presentJobs, scopeTeamIds } from './scope.js';

/** Changed jobs per pull; the phone asks again while `more` is true. */
export const CHANGES_PAGE = 200;

const ChangesQuery = z.strictObject({
  /** The `cursor` of the last bootstrap or changes answer. */
  cursor: z.string().regex(/^\d{1,18}$/, 'Cursor from the last sync'),
});

/**
 * Sync pull for field phones (docs/09 §6, T4.9, D-035).
 *
 * Cursor: a per-business change number. A database trigger gives every job
 * insert/update the business's next number (`ServiceJob.syncSeq`, counter in
 * `SyncCounter`), and customer, address, AC and team changes touch the jobs
 * they show on. The counter row is locked until commit, so numbers commit in
 * order: a phone that has seen number N has seen every change up to N. The
 * cursor is opaque to the phone (a decimal string).
 */
@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  /** The business's last change number (read before the rows, so nothing is skipped). */
  private async counter(organizationId: string): Promise<bigint> {
    const row = await this.prisma.syncCounter.findUnique({ where: { organizationId } });
    return row?.seq ?? 0n;
  }

  private async timeZone(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
    return org?.timezone ?? 'Asia/Kolkata';
  }

  /** Everything this person may hold offline: open jobs of my teams and today's finished ones. */
  async bootstrap(auth: AuthContext) {
    const organizationId = requireOrg(auth);
    const cursor = await this.counter(organizationId);
    const [scope, tz] = await Promise.all([fieldScope(this.prisma, auth), this.timeZone(organizationId)]);
    const teamIds = scopeTeamIds(scope);
    const today = dayIn(tz, new Date());
    const rows = await this.prisma.serviceJob.findMany({
      where: scoped(auth, {
        assignedTeamId: { in: teamIds },
        OR: [
          { status: { in: FIELD_OPEN } },
          { status: 'COMPLETED' as const, completedAt: { gte: new Date(Date.now() - 36 * 3600_000) } },
        ],
      }),
      orderBy: [{ scheduledDate: 'asc' }, { timeSlot: 'asc' }, { jobNumber: 'asc' }],
      take: 200,
      include: { equipment: { select: { equipmentId: true } } },
    });
    const jobs = rows.filter((j) => onFieldPhone(j, scope, today, tz));
    return { cursor: cursor.toString(), jobs: await presentJobs(this.prisma, auth, jobs, teamIds) };
  }

  /**
   * Jobs changed since `cursor`: the ones I still hold come back in full;
   * the ones I held but no longer may (cancelled, given to another team, I
   * left the team, lent to another team that day or the lending undone,
   * finished on an earlier day) come back as ids in `removed`.
   * `reset` means the cursor is not from this business: bootstrap again.
   */
  async changes(auth: AuthContext, since: string) {
    const organizationId = requireOrg(auth);
    const from = BigInt(since);
    const top = await this.counter(organizationId);
    if (from > top) return { cursor: top.toString(), jobs: [], removed: [], more: false, reset: true };

    const [scope, tz] = await Promise.all([fieldScope(this.prisma, auth), this.timeZone(organizationId)]);
    const teamIds = scopeTeamIds(scope);
    const today = dayIn(tz, new Date());
    const rows = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { syncSeq: { gt: from } }),
      orderBy: { syncSeq: 'asc' },
      take: CHANGES_PAGE,
      include: { equipment: { select: { equipmentId: true } } },
    });
    const kept = rows.filter((j) => onFieldPhone(j, scope, today, tz));
    const gone = rows.filter((j) => !onFieldPhone(j, scope, today, tz)).map((j) => j.id);
    // Only jobs that were ever with one of my teams: never hand out ids of other teams' work.
    const ever = await everTeamIds(this.prisma, auth);
    const mine = gone.length
      ? await this.prisma.jobAssignment.findMany({
          where: { organizationId, jobId: { in: gone }, teamId: { in: ever } },
          select: { jobId: true },
          distinct: ['jobId'],
        })
      : [];
    const more = rows.length === CHANGES_PAGE;
    const last = rows.at(-1)?.syncSeq ?? from;
    // A full page stops at its last row; otherwise every number up to `top`
    // (or a later row already seen) is covered.
    const cursor = more ? last : last > top ? last : top;
    return {
      cursor: cursor.toString(),
      jobs: await presentJobs(this.prisma, auth, kept, teamIds),
      removed: mine.map((m) => m.jobId),
      more,
      reset: false,
    };
  }
}

@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  /** First login or after the phone's store was cleared (docs/09 §6). */
  @Roles('SENIOR_TECHNICIAN', 'HELPER')
  @Get('bootstrap')
  bootstrap(@CurrentAuth() auth: AuthContext) {
    return this.sync.bootstrap(auth);
  }

  @Roles('SENIOR_TECHNICIAN', 'HELPER')
  @Get('changes')
  changes(@CurrentAuth() auth: AuthContext, @Query(new ZodValidationPipe(ChangesQuery)) q: { cursor: string }) {
    return this.sync.changes(auth, q.cursor);
  }
}
