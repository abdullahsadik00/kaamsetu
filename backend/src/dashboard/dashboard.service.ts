import { Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/token.service.js';
import { BillingService } from '../billing/billing.service.js';
import { dayIn } from '../field/scope.js';
import type { EnquirySource, JobStatus, MemberRole, ReportOutcome } from '../generated/prisma/client.js';
import { fromDate, toDate } from '../jobs/jobs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';

const OPEN: JobStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'];
/** Statuses shown on the "Today" card (cancelled jobs are left out). */
const TODAY: JobStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
/** Rows shown in "Needs your action" and "Latest from teams". */
const ACTION_ROWS = 10;
const LATEST_ROWS = 5;
/** A report asking for another visit stays in "Needs your action" this long, or until a follow-up job is made. */
const FOLLOW_UP_DAYS = 30;

/**
 * Why a job needs the owner (T4.12):
 * - HOLD_OURS: team can't continue (tool, gas, part, second person…),
 * - HOLD_CUSTOMER: customer not ready,
 * - NOT_SCHEDULED: open job without a day (appointment not fixed yet),
 * - FOLLOW_UP: the finish page said "needs another visit" / "couldn't do it" and no follow-up job exists.
 */
export type ActionKind = 'HOLD_OURS' | 'HOLD_CUSTOMER' | 'NOT_SCHEDULED' | 'FOLLOW_UP';
const ORDER: ActionKind[] = ['HOLD_OURS', 'HOLD_CUSTOMER', 'FOLLOW_UP', 'NOT_SCHEDULED'];

type ActionRow = {
  kind: ActionKind;
  jobId: string;
  jobNumber: number;
  customerId: string;
  teamId: string | null;
  /** Reason the team gave (hold) or the report note (follow-up). */
  note: string | null;
  at: Date;
};

/** Splits a hold note saved by the sync endpoint ("Our side: reason", "Customer side: reason"). */
export function holdSide(note: string | null): { side: 'OURS' | 'CUSTOMER' | null; reason: string | null } {
  if (!note) return { side: null, reason: null };
  for (const [prefix, side] of [
    ['Our side', 'OURS'],
    ['Customer side', 'CUSTOMER'],
  ] as const) {
    if (note === prefix) return { side, reason: null };
    if (note.startsWith(`${prefix}: `)) return { side, reason: note.slice(prefix.length + 2) || null };
  }
  return { side: null, reason: note };
}

/** Owner home (Stitch 02, T4.12): every count comes from the same rules as the lists it opens. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
  ) {}

  async get(auth: AuthContext) {
    const organizationId = requireOrg(auth);
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { timezone: true } });
    const today = dayIn(org?.timezone ?? 'Asia/Kolkata', new Date());

    const [enquiries, needTeam, todayJobs, actions, latest, money] = await Promise.all([
      this.enquiries(auth),
      this.needTeam(auth),
      this.today(auth, today),
      this.needsAction(auth),
      this.latest(auth),
      this.billing.summary(auth),
    ]);

    const customerIds = [
      ...(enquiries.newest ? [enquiries.newest.customerId] : []),
      ...(needTeam.next ? [needTeam.next.customerId] : []),
      ...actions.items.map((a) => a.customerId),
      ...latest.map((l) => l.customerId),
    ];
    const teamIds = actions.items.map((a) => a.teamId).filter((x): x is string => !!x);
    const [customers, teams] = await Promise.all([
      this.prisma.customer.findMany({ where: scoped(auth, { id: { in: [...new Set(customerIds)] } }), select: { id: true, name: true } }),
      this.prisma.team.findMany({ where: scoped(auth, { id: { in: [...new Set(teamIds)] } }), select: { id: true, name: true } }),
    ]);
    const name = new Map(customers.map((c) => [c.id, c.name]));
    const team = new Map(teams.map((t) => [t.id, t.name]));

    return {
      today,
      enquiries: {
        open: enquiries.open,
        bySource: enquiries.bySource,
        newest: enquiries.newest && { id: enquiries.newest.id, customerName: name.get(enquiries.newest.customerId) ?? '' },
      },
      needTeam: {
        count: needTeam.count,
        next: needTeam.next && {
          id: needTeam.next.id,
          jobNumber: needTeam.next.jobNumber,
          customerName: name.get(needTeam.next.customerId) ?? '',
          scheduledDate: fromDate(needTeam.next.scheduledDate),
          timeSlot: needTeam.next.timeSlot,
        },
      },
      needsAction: {
        count: actions.count,
        items: actions.items.map((a) => ({
          kind: a.kind,
          jobId: a.jobId,
          jobNumber: a.jobNumber,
          customerName: name.get(a.customerId) ?? '',
          teamName: a.teamId ? (team.get(a.teamId) ?? null) : null,
          note: a.note,
          at: a.at,
        })),
      },
      todayByStatus: todayJobs,
      latest: latest.map((l) => ({
        jobId: l.jobId,
        jobNumber: l.jobNumber,
        customerName: name.get(l.customerId) ?? '',
        toStatus: l.toStatus,
        note: l.note,
        by: l.by,
        at: l.at,
      })),
      money: {
        // Same numbers as GET /billing/summary (one place for money math).
        toCollect: money.toCollect,
        cashWithTeams: money.cashWithTeams,
        cashCount: money.cash.length,
        readyToBill: money.readyToBill.length,
      },
    };
  }

  /** Open enquiries: count, count per source, newest one (same rule as GET /enquiries?status=OPEN). */
  private async enquiries(auth: AuthContext) {
    const groups = await this.prisma.serviceRequest.groupBy({
      by: ['source'],
      where: scoped(auth, { status: 'OPEN' as const }),
      _count: { _all: true },
    });
    const newest = await this.prisma.serviceRequest.findFirst({
      where: scoped(auth, { status: 'OPEN' as const }),
      orderBy: { createdAt: 'desc' },
      select: { id: true, customerId: true },
    });
    const bySource: Partial<Record<EnquirySource, number>> = {};
    for (const g of groups) bySource[g.source] = g._count._all;
    return { open: groups.reduce((s, g) => s + g._count._all, 0), bySource, newest };
  }

  /** Open jobs without a team; the next one is the earliest day (undated last). */
  private async needTeam(auth: AuthContext) {
    const where = scoped(auth, { status: { in: OPEN }, assignedTeamId: null });
    const [count, next] = await Promise.all([
      this.prisma.serviceJob.count({ where }),
      this.prisma.serviceJob.findFirst({
        where,
        orderBy: [{ scheduledDate: { sort: 'asc', nulls: 'last' } }, { timeSlot: 'asc' }, { jobNumber: 'asc' }],
        select: { id: true, jobNumber: true, customerId: true, scheduledDate: true, timeSlot: true },
      }),
    ]);
    return { count, next };
  }

  /** Jobs on today's date (business time zone) by status, as GET /jobs?date=today shows them. */
  private async today(auth: AuthContext, today: string) {
    const groups = await this.prisma.serviceJob.groupBy({
      by: ['status'],
      where: scoped(auth, { scheduledDate: toDate(today), status: { in: TODAY } }),
      _count: { _all: true },
    });
    const n = (s: JobStatus) => groups.find((g) => g.status === s)?._count._all ?? 0;
    return {
      total: groups.reduce((s, g) => s + g._count._all, 0),
      NEW: n('NEW'),
      ASSIGNED: n('ASSIGNED'),
      IN_PROGRESS: n('IN_PROGRESS'),
      ON_HOLD: n('ON_HOLD'),
      COMPLETED: n('COMPLETED'),
    };
  }

  private async needsAction(auth: AuthContext) {
    const held = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { status: 'ON_HOLD' as const }),
      select: { id: true, jobNumber: true, customerId: true, assignedTeamId: true, updatedAt: true },
    });
    const holds = await this.prisma.jobStatusHistory.findMany({
      where: scoped(auth, { jobId: { in: held.map((j) => j.id) }, toStatus: 'ON_HOLD' as const }),
      orderBy: { at: 'desc' },
      select: { jobId: true, note: true, at: true },
    });
    const lastHold = new Map<string, { note: string | null; at: Date }>();
    for (const h of holds) if (!lastHold.has(h.jobId)) lastHold.set(h.jobId, h);

    const undated = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { status: { in: ['NEW', 'ASSIGNED'] as JobStatus[] }, scheduledDate: null }),
      select: { id: true, jobNumber: true, customerId: true, assignedTeamId: true, createdAt: true },
    });

    const since = new Date(Date.now() - FOLLOW_UP_DAYS * 86_400_000);
    const reports = await this.prisma.serviceReport.findMany({
      where: scoped(auth, {
        outcome: { in: ['NEEDS_FOLLOW_UP', 'NOT_COMPLETED'] as ReportOutcome[] },
        createdAt: { gte: since },
        job: { status: 'COMPLETED' as const },
      }),
      select: {
        jobId: true,
        note: true,
        createdAt: true,
        job: { select: { jobNumber: true, customerId: true, assignedTeamId: true } },
      },
    });
    const followed = await this.prisma.serviceJob.findMany({
      where: scoped(auth, { followUpOfJobId: { in: reports.map((r) => r.jobId) } }),
      select: { followUpOfJobId: true },
    });
    const hasFollowUp = new Set(followed.map((f) => f.followUpOfJobId));

    const rows: ActionRow[] = [
      ...held.map((j): ActionRow => {
        const h = lastHold.get(j.id);
        const { side, reason } = holdSide(h?.note ?? null);
        return {
          kind: side === 'CUSTOMER' ? 'HOLD_CUSTOMER' : 'HOLD_OURS',
          jobId: j.id,
          jobNumber: j.jobNumber,
          customerId: j.customerId,
          teamId: j.assignedTeamId,
          note: reason,
          at: h?.at ?? j.updatedAt,
        };
      }),
      ...reports
        .filter((r) => !hasFollowUp.has(r.jobId))
        .map(
          (r): ActionRow => ({
            kind: 'FOLLOW_UP',
            jobId: r.jobId,
            jobNumber: r.job.jobNumber,
            customerId: r.job.customerId,
            teamId: r.job.assignedTeamId,
            note: r.note,
            at: r.createdAt,
          }),
        ),
      ...undated.map(
        (j): ActionRow => ({
          kind: 'NOT_SCHEDULED',
          jobId: j.id,
          jobNumber: j.jobNumber,
          customerId: j.customerId,
          teamId: j.assignedTeamId,
          note: null,
          at: j.createdAt,
        }),
      ),
    ];
    rows.sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind) || y.at.getTime() - x.at.getTime());
    return { count: rows.length, items: rows.slice(0, ACTION_ROWS) };
  }

  /** Newest status changes made by field staff (Stitch 03 "Updates from teams"). */
  private async latest(auth: AuthContext) {
    const staff = await this.prisma.organizationMember.findMany({
      where: scoped(auth, { role: { in: ['SENIOR_TECHNICIAN', 'HELPER'] as MemberRole[] } }),
      select: { id: true, user: { select: { name: true } } },
    });
    const rows = await this.prisma.jobStatusHistory.findMany({
      where: scoped(auth, { byMemberId: { in: staff.map((s) => s.id) } }),
      orderBy: { at: 'desc' },
      take: LATEST_ROWS,
      select: { jobId: true, toStatus: true, note: true, byMemberId: true, at: true, job: { select: { jobNumber: true, customerId: true } } },
    });
    const who = new Map(staff.map((s) => [s.id, s.user.name]));
    return rows.map((r) => ({
      jobId: r.jobId,
      jobNumber: r.job.jobNumber,
      customerId: r.job.customerId,
      toStatus: r.toStatus,
      note: r.toStatus === 'ON_HOLD' ? holdSide(r.note).reason : r.note,
      by: who.get(r.byMemberId) ?? '',
      at: r.at,
    }));
  }
}
