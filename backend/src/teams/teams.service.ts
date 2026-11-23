import { HttpStatus, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import { businessToday, dayLendings, lendHelper, teamDay, undoLending } from './day-helpers.js';
import type { DayHelper, LendHelper } from './day-helpers.js';

export const CreateTeamSchema = z.strictObject({
  name: z.string().trim().min(1, 'Enter a team name').max(40),
  seniorMemberId: z.uuid().optional(),
  helperMemberIds: z.array(z.uuid()).max(10).default([]),
});
export type CreateTeam = z.infer<typeof CreateTeamSchema>;

export const UpdateTeamSchema = z
  .strictObject({ name: z.string().trim().min(1).max(40), active: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to change' });
export type UpdateTeam = z.infer<typeof UpdateTeamSchema>;

export const AddTeamMemberSchema = z.strictObject({
  memberId: z.uuid(),
  /** For a senior: make them the team's primary senior (default when the team has none). */
  primary: z.boolean().optional(),
});
export type AddTeamMember = z.infer<typeof AddTeamMemberSchema>;

const teamInclude = {
  members: {
    where: { leftAt: null },
    orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }, { joinedAt: 'asc' }],
    select: {
      id: true,
      position: true,
      isPrimary: true,
      member: {
        select: { id: true, role: true, user: { select: { name: true, phone: true } } },
      },
    },
  },
} satisfies Prisma.TeamInclude;

type TeamRow = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

function present(t: TeamRow, day: string, lendings: DayHelper[]) {
  return {
    id: t.id,
    name: t.name,
    active: t.active,
    members: t.members.map((m) => ({
      memberId: m.member.id,
      position: m.position,
      isPrimary: m.isPrimary,
      name: m.member.user.name,
      phone: m.member.user.phone,
    })),
    // That day's crew changes (T4.6, D-038): own helpers lent elsewhere, helpers borrowed.
    day,
    ...teamDay(
      t.id,
      t.members.map((m) => m.member.id),
      lendings,
    ),
  };
}

const bad = (code: string, message: string) =>
  new AppError(HttpStatus.BAD_REQUEST, code, message);

/** Teams: one primary senior technician and helpers (docs/05 §2, T4.2, D-029). */
@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Teams with who works with whom on `day` (default: today in the business time zone). */
  async list(auth: AuthContext, day?: string) {
    const d = day ?? (await businessToday(this.prisma, auth));
    const [teams, lendings] = await Promise.all([
      this.prisma.team.findMany({
        where: scoped(auth),
        orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
        include: teamInclude,
      }),
      dayLendings(this.prisma, auth, d),
    ]);
    return teams.map((t) => present(t, d, lendings));
  }

  async get(auth: AuthContext, id: string, day?: string) {
    const t = await this.prisma.team.findFirst({
      where: scoped(auth, { id }),
      include: teamInclude,
    });
    if (!t) throw AppError.notFound('TEAM_NOT_FOUND');
    const d = day ?? (await businessToday(this.prisma, auth));
    return present(t, d, await dayLendings(this.prisma, auth, d));
  }

  /** One-day helper swap: `memberId` works with this team on `day` (D-038). Answers with the team that day. */
  async lend(auth: AuthContext, teamId: string, input: LendHelper) {
    await lendHelper(this.prisma, auth, teamId, input);
    return this.get(auth, teamId, input.day);
  }

  /** Undoes a one-day swap; the helper is back with their own team that day. */
  async undoLend(auth: AuthContext, teamId: string, lendingId: string) {
    const day = await undoLending(this.prisma, auth, teamId, lendingId);
    return this.get(auth, teamId, day);
  }

  async create(auth: AuthContext, input: CreateTeam) {
    const organizationId = requireOrg(auth);
    const team = await this.prisma.$transaction(async (tx) => {
      const t = await tx.team.create({ data: { organizationId, name: input.name } });
      if (input.seniorMemberId) {
        await this.join(tx, auth, t.id, input.seniorMemberId, true);
      }
      for (const helperId of new Set(input.helperMemberIds)) {
        await this.join(tx, auth, t.id, helperId, false);
      }
      return t;
    });
    return this.get(auth, team.id);
  }

  async update(auth: AuthContext, id: string, input: UpdateTeam) {
    const result = await this.prisma.team.updateMany({
      where: scoped(auth, { id }),
      data: input,
    });
    if (result.count === 0) throw AppError.notFound('TEAM_NOT_FOUND');
    return this.get(auth, id);
  }

  async addMember(auth: AuthContext, teamId: string, input: AddTeamMember) {
    await this.prisma.$transaction(async (tx) => {
      const team = await tx.team.findFirst({ where: scoped(auth, { id: teamId }) });
      if (!team) throw AppError.notFound('TEAM_NOT_FOUND');
      await this.join(tx, auth, teamId, input.memberId, input.primary);
    });
    return this.get(auth, teamId);
  }

  async removeMember(auth: AuthContext, teamId: string, memberId: string) {
    const team = await this.prisma.team.findFirst({ where: scoped(auth, { id: teamId }) });
    if (!team) throw AppError.notFound('TEAM_NOT_FOUND');
    await this.prisma.$transaction(async (tx) => {
      const left = await tx.teamMember.findFirst({
        where: { teamId, organizationMemberId: memberId, leftAt: null },
      });
      if (!left) throw AppError.notFound('TEAM_MEMBER_NOT_FOUND');
      await tx.teamMember.update({
        where: { id: left.id },
        data: { leftAt: new Date(), isPrimary: false },
      });
      // A primary senior left: promote the longest-serving remaining senior.
      if (left.isPrimary) {
        const next = await tx.teamMember.findFirst({
          where: { teamId, leftAt: null, position: 'SENIOR_TECHNICIAN' },
          orderBy: { joinedAt: 'asc' },
        });
        if (next) await tx.teamMember.update({ where: { id: next.id }, data: { isPrimary: true } });
      }
    });
    return this.get(auth, teamId);
  }

  /**
   * Puts an active employee of the same business into a team, in the
   * position matching their role. An owner who does field work themselves
   * (one- or two-person business, D-043) joins as the senior. A senior becomes
   * primary if asked, or when the team has no primary senior yet; only one
   * primary at a time.
   */
  private async join(
    tx: Prisma.TransactionClient,
    auth: AuthContext,
    teamId: string,
    memberId: string,
    primary?: boolean,
  ) {
    const member = await tx.organizationMember.findFirst({
      where: scoped(auth, { id: memberId }),
    });
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    if (member.status !== 'ACTIVE') {
      throw bad('EMPLOYEE_NOT_ACTIVE', 'This person has been removed from the business.');
    }
    const already = await tx.teamMember.findFirst({
      where: { teamId, organizationMemberId: memberId, leftAt: null },
    });
    if (already) throw new AppError(HttpStatus.CONFLICT, 'ALREADY_IN_TEAM', 'Already in this team.');

    const position = member.role === 'OWNER' ? 'SENIOR_TECHNICIAN' : member.role;
    let isPrimary = false;
    if (position === 'SENIOR_TECHNICIAN') {
      const current = await tx.teamMember.findFirst({
        where: { teamId, leftAt: null, isPrimary: true },
      });
      isPrimary = primary ?? !current;
      if (isPrimary && current) {
        await tx.teamMember.update({ where: { id: current.id }, data: { isPrimary: false } });
      }
    }
    await tx.teamMember.create({
      data: {
        organizationId: member.organizationId,
        teamId,
        organizationMemberId: memberId,
        position,
        isPrimary,
      },
    });
  }
}
