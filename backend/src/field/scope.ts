import type { AuthContext } from '../auth/token.service.js';
import type { JobStatus, ServiceJob } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { scoped } from '../tenancy/tenant.js';

/**
 * What field staff may hold (docs/09 §2, docs/10 §3): jobs of a team they are
 * in now, or, on a day a helper is lent to another team (T4.6, D-038), that
 * team's jobs for that day instead of their own team's. Shared by
 * `GET /my/jobs` and the sync pull (T4.7, T4.9).
 */
export const FIELD_OPEN: JobStatus[] = ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'];

export type JobWithAcs = ServiceJob & { equipment: { equipmentId: string }[] };

export async function myTeamIds(prisma: PrismaService, auth: AuthContext): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { organizationMemberId: auth.memberId as string, leftAt: null, team: { active: true } },
    select: { teamId: true },
  });
  return rows.map((r) => r.teamId);
}

/**
 * Every team I am or ever was in, or was lent to for a day (also undone), to
 * tell "moved away from me" apart from "never mine".
 */
export async function everTeamIds(prisma: PrismaService, auth: AuthContext): Promise<string[]> {
  const [rows, lent] = await Promise.all([
    prisma.teamMember.findMany({ where: { organizationMemberId: auth.memberId as string }, select: { teamId: true } }),
    prisma.teamDayHelper.findMany({ where: { organizationMemberId: auth.memberId as string }, select: { teamId: true } }),
  ]);
  return [...new Set([...rows, ...lent].map((r) => r.teamId))];
}

/** Who I work with: my own teams, and the team I am lent to on given days (YYYY-MM-DD to team id). */
export type FieldScope = { home: string[]; lent: Map<string, string> };

/** How far back lendings still matter (open jobs from earlier days stay on phones). */
const LENT_LOOKBACK_DAYS = 60;

export async function fieldScope(prisma: PrismaService, auth: AuthContext): Promise<FieldScope> {
  const since = new Date(Date.now() - LENT_LOOKBACK_DAYS * 24 * 3600_000).toISOString().slice(0, 10);
  const [home, lent] = await Promise.all([
    myTeamIds(prisma, auth),
    prisma.teamDayHelper.findMany({
      where: {
        organizationId: auth.organizationId as string,
        organizationMemberId: auth.memberId as string,
        removedAt: null,
        day: { gte: new Date(`${since}T00:00:00.000Z`) },
        team: { active: true },
      },
      select: { teamId: true, day: true },
    }),
  ]);
  return { home, lent: new Map(lent.map((l) => [l.day.toISOString().slice(0, 10), l.teamId])) };
}

/** Every team whose jobs I may see on some day (for the database query; then filter with `withMyTeam`). */
export const scopeTeamIds = (scope: FieldScope) => [...new Set([...scope.home, ...scope.lent.values()])];

/** Whether the job belongs to the team I am with on the job's day. */
export function withMyTeam(
  job: Pick<ServiceJob, 'assignedTeamId'> & { scheduledDate?: Date | null },
  scope: FieldScope | string[],
): boolean {
  const s = Array.isArray(scope) ? { home: scope, lent: new Map<string, string>() } : scope;
  if (!job.assignedTeamId) return false;
  const lentTo = job.scheduledDate ? s.lent.get(job.scheduledDate.toISOString().slice(0, 10)) : undefined;
  if (lentTo) return job.assignedTeamId === lentTo;
  return s.home.includes(job.assignedTeamId);
}

/** YYYY-MM-DD of `at` in the business's time zone. */
export function dayIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * Whether the phone of someone with this scope keeps this job: an open job of
 * the team they are with on the job's day, or one that team finished today
 * (business time zone).
 */
export function onFieldPhone(
  job: Pick<ServiceJob, 'assignedTeamId' | 'status' | 'completedAt'> & { scheduledDate?: Date | null },
  scope: FieldScope | string[],
  today: string,
  timeZone: string,
): boolean {
  if (!withMyTeam(job, scope)) return false;
  if (FIELD_OPEN.includes(job.status)) return true;
  return job.status === 'COMPLETED' && !!job.completedAt && dayIn(timeZone, job.completedAt) === today;
}

/** Field staff's card for each job: customer, place, team lead; full details for seniors only (Q-01). */
export async function presentJobs(prisma: PrismaService, auth: AuthContext, jobs: JobWithAcs[], teamIds: string[]) {
  const helper = auth.role === 'HELPER';
  const customers = await prisma.customer.findMany({
    where: scoped(auth, { id: { in: jobs.map((j) => j.customerId) } }),
    select: { id: true, name: true, phone: true },
  });
  const sites = await prisma.site.findMany({
    where: scoped(auth, { id: { in: jobs.map((j) => j.siteId) } }),
  });
  const acs = await prisma.equipment.findMany({
    where: scoped(auth, { id: { in: jobs.flatMap((j) => j.equipment.map((e) => e.equipmentId)) } }),
    select: { id: true, type: true, brand: true, capacityTons: true, locationLabel: true },
  });
  const seniors = await prisma.teamMember.findMany({
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
      completedAt: j.completedAt?.toISOString() ?? null,
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
