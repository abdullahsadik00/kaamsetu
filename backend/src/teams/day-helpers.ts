import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { dayIn } from '../field/scope.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';

/**
 * One-day helper swap (T4.6, D-038): the owner lends a helper to another team
 * for one day ("Santosh works with Team 2 today") without changing the
 * permanent team. That day the helper sees the other team's jobs and not their
 * own team's (field/scope.ts). A database trigger touches the jobs of both
 * teams on that day, so phones pick the change up through `GET /sync/changes`.
 */

/** How far ahead the owner may plan a swap. */
export const LEND_DAYS_AHEAD = 30;

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date as YYYY-MM-DD');

export const LendHelperSchema = z.strictObject({ memberId: z.uuid(), day: ymd });
export type LendHelper = z.infer<typeof LendHelperSchema>;

export const DayQuerySchema = z.strictObject({ day: ymd.optional() });

const bad = (code: string, message: string) => new AppError(HttpStatus.BAD_REQUEST, code, message);
const toDay = (d: string) => new Date(`${d}T00:00:00.000Z`);
const fromDay = (d: Date) => d.toISOString().slice(0, 10);

function addDays(day: string, n: number): string {
  const d = toDay(day);
  d.setUTCDate(d.getUTCDate() + n);
  return fromDay(d);
}

/** Today in the business's time zone. */
export async function businessToday(prisma: PrismaService | Prisma.TransactionClient, auth: AuthContext): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: requireOrg(auth) }, select: { timezone: true } });
  return dayIn(org?.timezone ?? 'Asia/Kolkata', new Date());
}

/** A helper lent to a team that day, as the team page shows it. */
export type DayHelper = {
  lendingId: string;
  memberId: string;
  name: string;
  phone: string | null;
  /** Their own team (first one, if several); null when they have none. */
  fromTeamId: string | null;
  fromTeamName: string | null;
  toTeamId: string;
  toTeamName: string;
};

/** Who works with whom on one day: live lendings of the business for that day. */
export async function dayLendings(prisma: PrismaService, auth: AuthContext, day: string): Promise<DayHelper[]> {
  const rows = await prisma.teamDayHelper.findMany({
    where: scoped(auth, { day: toDay(day), removedAt: null }),
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      teamId: true,
      team: { select: { name: true } },
      member: {
        select: {
          id: true,
          user: { select: { name: true, phone: true } },
          teamSlots: {
            where: { leftAt: null },
            orderBy: { joinedAt: 'asc' },
            select: { teamId: true, team: { select: { name: true } } },
          },
        },
      },
    },
  });
  return rows.map((r) => {
    const home = r.member.teamSlots.find((s) => s.teamId !== r.teamId);
    return {
      lendingId: r.id,
      memberId: r.member.id,
      name: r.member.user.name ?? r.member.user.phone ?? '',
      phone: r.member.user.phone,
      fromTeamId: home?.teamId ?? null,
      fromTeamName: home?.team.name ?? null,
      toTeamId: r.teamId,
      toTeamName: r.team.name,
    };
  });
}

/** The day's changes for one team: its helpers lent elsewhere, and helpers borrowed from others. */
export function teamDay(teamId: string, memberIds: string[], lendings: DayHelper[]) {
  return {
    lentOut: lendings.filter((l) => l.toTeamId !== teamId && memberIds.includes(l.memberId)),
    borrowed: lendings.filter((l) => l.toTeamId === teamId),
  };
}

/** Owner lends `memberId` (a helper) to `teamId` on `day`. */
export async function lendHelper(prisma: PrismaService, auth: AuthContext, teamId: string, input: LendHelper) {
  const organizationId = requireOrg(auth);
  await prisma.$transaction(async (tx) => {
    const team = await tx.team.findFirst({ where: scoped(auth, { id: teamId }) });
    if (!team) throw AppError.notFound('TEAM_NOT_FOUND');
    if (!team.active) throw bad('TEAM_NOT_ACTIVE', 'This team is not in use.');
    const today = await businessToday(tx, auth);
    if (input.day < today) throw bad('DAY_IN_PAST', 'Choose today or a later day.');
    if (input.day > addDays(today, LEND_DAYS_AHEAD)) {
      throw bad('DAY_TOO_FAR', `Choose a day within ${LEND_DAYS_AHEAD} days.`);
    }
    // Lock the person so two lendings for the same day cannot both pass the check.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "OrganizationMember"
      WHERE "id" = ${input.memberId}::uuid AND "organizationId" = ${organizationId}::uuid
      FOR UPDATE`;
    if (locked.length === 0) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    const member = await tx.organizationMember.findFirst({ where: scoped(auth, { id: input.memberId }) });
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    if (member.status !== 'ACTIVE') {
      throw bad('EMPLOYEE_NOT_ACTIVE', 'This person has been removed from the business.');
    }
    if (member.role !== 'HELPER') throw bad('NOT_A_HELPER', 'Only helpers can be lent for a day.');
    const inTeam = await tx.teamMember.findFirst({
      where: { teamId, organizationMemberId: member.id, leftAt: null },
    });
    if (inTeam) throw new AppError(HttpStatus.CONFLICT, 'ALREADY_IN_TEAM', 'Already in this team.');
    const taken = await tx.teamDayHelper.findFirst({
      where: { organizationId, organizationMemberId: member.id, day: toDay(input.day), removedAt: null },
    });
    if (taken) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'ALREADY_LENT',
        'Already working with another team that day. Undo that first.',
      );
    }
    await tx.teamDayHelper.create({
      data: {
        organizationId,
        teamId,
        organizationMemberId: member.id,
        day: toDay(input.day),
        createdByMemberId: auth.memberId as string,
      },
    });
  });
}

/** Owner undoes a lending (today or later); the helper is back with their own team that day. */
export async function undoLending(prisma: PrismaService, auth: AuthContext, teamId: string, lendingId: string) {
  const row = await prisma.teamDayHelper.findFirst({
    where: scoped(auth, { id: lendingId, teamId, removedAt: null }),
  });
  if (!row) throw AppError.notFound('LENDING_NOT_FOUND');
  if (fromDay(row.day) < (await businessToday(prisma, auth))) {
    throw bad('DAY_IN_PAST', 'Past days cannot be changed.');
  }
  await prisma.teamDayHelper.update({
    where: { id: row.id },
    data: { removedAt: new Date(), removedByMemberId: auth.memberId as string },
  });
  return fromDay(row.day);
}

/** A person working with a team on a day (job page, D-038). */
export type CrewMember = {
  memberId: string;
  name: string;
  position: 'SENIOR_TECHNICIAN' | 'HELPER';
  isPrimary: boolean;
  /** Set for a helper borrowed for the day: the team they normally work with. */
  lentFromTeamName: string | null;
  borrowed: boolean;
};

/** The team's crew on `day`: its members minus helpers lent elsewhere, plus helpers borrowed. */
export async function dayCrew(prisma: PrismaService, auth: AuthContext, teamId: string, day: string): Promise<CrewMember[]> {
  const [members, lendings] = await Promise.all([
    prisma.teamMember.findMany({
      where: scoped(auth, { teamId, leftAt: null }),
      orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { joinedAt: 'asc' }],
      select: {
        position: true,
        isPrimary: true,
        member: { select: { id: true, user: { select: { name: true, phone: true } } } },
      },
    }),
    dayLendings(prisma, auth, day),
  ]);
  const { lentOut, borrowed } = teamDay(
    teamId,
    members.map((m) => m.member.id),
    lendings,
  );
  const away = new Set(lentOut.map((l) => l.memberId));
  return [
    ...members
      .filter((m) => !away.has(m.member.id))
      .map((m) => ({
        memberId: m.member.id,
        name: m.member.user.name ?? m.member.user.phone ?? '',
        position: m.position,
        isPrimary: m.isPrimary,
        lentFromTeamName: null,
        borrowed: false,
      })),
    ...borrowed.map((b) => ({
      memberId: b.memberId,
      name: b.name,
      position: 'HELPER' as const,
      isPrimary: false,
      lentFromTeamName: b.fromTeamName,
      borrowed: true,
    })),
  ];
}
