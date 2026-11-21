import type { AuthContext } from '../auth/token.service.js';
import type { JobStatus, ServiceJob } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { scoped } from '../tenancy/tenant.js';

/**
 * What field staff may hold (docs/09 §2, docs/10 §3): jobs of a team they are
 * in now. Shared by `GET /my/jobs` and the sync pull (T4.7, T4.9).
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

/** Every team I am or ever was in (to tell "moved away from me" apart from "never mine"). */
export async function everTeamIds(prisma: PrismaService, auth: AuthContext): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { organizationMemberId: auth.memberId as string },
    select: { teamId: true },
  });
  return [...new Set(rows.map((r) => r.teamId))];
}

/** YYYY-MM-DD of `at` in the business's time zone. */
export function dayIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
}

/**
 * Whether the phone of someone in `teamIds` keeps this job: an open job of
 * their team, or one their team finished today (business time zone).
 */
export function onFieldPhone(
  job: Pick<ServiceJob, 'assignedTeamId' | 'status' | 'completedAt'>,
  teamIds: string[],
  today: string,
  timeZone: string,
): boolean {
  if (!job.assignedTeamId || !teamIds.includes(job.assignedTeamId)) return false;
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
