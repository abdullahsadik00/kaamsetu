import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { audit } from '../common/audit.js';
import type { MemberRole, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg } from '../tenancy/tenant.js';
import { CREW_EMPLOYEE_LIMIT, featuresFor } from './features.js';
import type {
  ChangeBusinessType,
  CreateEmployee,
  CreateOrganization,
  UpdateOrganization,
} from './organization.schemas.js';

const OPEN_JOB = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] as const;

/** Employees still in the business (the owner not counted). */
const activeStaff = (tx: Prisma.TransactionClient, organizationId: string) =>
  tx.organizationMember.count({ where: { organizationId, status: 'ACTIVE', role: { not: 'OWNER' } } });

/**
 * The owner's own team for SOLO and CREW (D-044): the first active team the
 * owner is in, else a new "My team" with the owner as its primary senior.
 */
async function ownTeam(tx: Prisma.TransactionClient, organizationId: string, ownerMemberId: string) {
  const mine = await tx.teamMember.findFirst({
    where: { organizationId, organizationMemberId: ownerMemberId, leftAt: null, team: { active: true } },
    orderBy: { joinedAt: 'asc' },
    select: { teamId: true },
  });
  if (mine) return mine.teamId;
  const team = await tx.team.create({ data: { organizationId, name: 'My team' } });
  await tx.teamMember.create({
    data: { organizationId, teamId: team.id, organizationMemberId: ownerMemberId, position: 'SENIOR_TECHNICIAN', isPrimary: true },
  });
  return team.id;
}

/** Puts an employee into the owner's team in the position matching their role, unless already there. */
async function joinTeam(tx: Prisma.TransactionClient, organizationId: string, teamId: string, member: { id: string; role: MemberRole }) {
  if (member.role === 'OWNER') return;
  const there = await tx.teamMember.findFirst({ where: { teamId, organizationMemberId: member.id, leftAt: null } });
  if (there) return;
  await tx.teamMember.create({
    data: { organizationId, teamId, organizationMemberId: member.id, position: member.role, isPrimary: false },
  });
}

/** Trial length promised to early-access businesses (D-014). */
export const TRIAL_DAYS = 30;

/** Onboarding (T4.1) and adding staff, built early under D-027. */
@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates the caller's business: organization, OWNER membership and a
   * 30-day trial, in one transaction. A person runs one business at a time
   * (docs/03), so a caller who already belongs to one is refused. The app
   * then refreshes its token to pick up the new role.
   */
  async create(auth: AuthContext, input: CreateOrganization) {
    if (auth.memberId) {
      throw new AppError(
        HttpStatus.CONFLICT,
        'ALREADY_IN_BUSINESS',
        'You already belong to a business.',
      );
    }
    const trialEnd = new Date(Date.now() + TRIAL_DAYS * 24 * 3600_000);
    return this.prisma.$transaction(async (tx) => {
      const active = await tx.organizationMember.count({
        where: { userId: auth.userId, status: 'ACTIVE' },
      });
      if (active > 0) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'ALREADY_IN_BUSINESS',
          'You already belong to a business.',
        );
      }
      const org = await tx.organization.create({
        data: {
          name: input.name,
          phone: input.phone,
          city: input.city || null,
          gstBills: input.gstBills,
          gstin: input.gstin ?? null,
          businessType: input.businessType,
          subscription: {
            create: {
              currentPeriodEnd: trialEnd,
              trialEndsAt: trialEnd,
            },
          },
        },
        select: { id: true, name: true, phone: true, city: true, gstBills: true, gstin: true },
      });
      const owner = await tx.organizationMember.create({
        data: { organizationId: org.id, userId: auth.userId, role: 'OWNER' },
      });
      // A solo technician or a crew does the field work: their own team (D-044).
      if (input.businessType !== 'VENDOR') await ownTeam(tx, org.id, owner.id);
      // Owner's own number: set it if they have none and nobody else uses it.
      const user = await tx.user.findUniqueOrThrow({ where: { id: auth.userId } });
      const phoneFree =
        !user.phone &&
        !(await tx.user.findUnique({ where: { phone: input.phone } }));
      await tx.user.update({
        where: { id: auth.userId },
        data: { name: input.ownerName, ...(phoneFree ? { phone: input.phone } : {}) },
      });
      return { ...org, trialEndsAt: trialEnd };
    });
  }

  /** Owner edits the business details (D-027). */
  async update(auth: AuthContext, input: UpdateOrganization) {
    return this.prisma.organization.update({
      where: { id: requireOrg(auth) },
      data: {
        ...input,
        ...(input.city !== undefined ? { city: input.city || null } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        city: true,
        currencyCode: true,
        timezone: true,
        gstBills: true,
        gstin: true,
      },
    });
  }

  /**
   * Owner removes someone who left (D-027). Their membership becomes
   * INACTIVE, so the auth guard rejects their very next request; their
   * phones are signed out and any open invite is cancelled. Adding the same
   * mobile again later reactivates them. The record stays for history.
   */
  async deactivateEmployee(auth: AuthContext, memberId: string) {
    const organizationId = requireOrg(auth);
    const member = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    if (member.id === auth.memberId || member.role === 'OWNER') {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'CANNOT_REMOVE_OWNER',
        'The owner cannot be removed.',
      );
    }
    const now = new Date();
    const led = await this.prisma.teamMember.findMany({
      where: { organizationMemberId: member.id, leftAt: null, isPrimary: true },
      select: { teamId: true },
    });
    await this.prisma.$transaction([
      this.prisma.organizationMember.update({
        where: { id: member.id },
        data: { status: 'INACTIVE', deactivatedAt: member.deactivatedAt ?? now },
      }),
      this.prisma.memberInvite.updateMany({
        where: { memberId: member.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.teamMember.updateMany({
        where: { organizationMemberId: member.id, leftAt: null },
        data: { leftAt: now, isPrimary: false },
      }),
      this.prisma.device.updateMany({
        where: { userId: member.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      audit(this.prisma, auth, 'EMPLOYEE_REMOVED', 'OrganizationMember', member.id, { role: member.role }),
    ]);
    // A team whose lead was removed gets its longest-serving senior as lead,
    // as when a lead leaves the team (BUG-19).
    for (const { teamId } of led) {
      const next = await this.prisma.teamMember.findFirst({
        where: { teamId, leftAt: null, position: 'SENIOR_TECHNICIAN' },
        orderBy: { joinedAt: 'asc' },
      });
      if (next) await this.prisma.teamMember.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return { removed: true };
  }

  /**
   * Owner adds a senior technician or helper. The person gets an employee
   * record now and links their Google login later via an invite (D-025).
   */
  async addEmployee(auth: AuthContext, input: CreateEmployee) {
    const organizationId = requireOrg(auth);
    return this.prisma.$transaction(async (tx) => {
      const { businessType } = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { businessType: true } });
      if (businessType === 'CREW' && (await activeStaff(tx, organizationId)) >= CREW_EMPLOYEE_LIMIT) {
        throw new AppError(
          HttpStatus.CONFLICT,
          'EMPLOYEE_LIMIT',
          'A two-person business has one employee. Change the business type to add more.',
        );
      }
      let user = await tx.user.findUnique({
        where: { phone: input.phone },
        include: { memberships: true },
      });
      if (user) {
        const here = user.memberships.find((m) => m.organizationId === organizationId);
        if (here?.status === 'ACTIVE') {
          throw new AppError(
            HttpStatus.CONFLICT,
            'EMPLOYEE_EXISTS',
            'This mobile number is already in your business.',
          );
        }
        const elsewhere = user.memberships.some(
          (m) => m.organizationId !== organizationId && m.status === 'ACTIVE',
        );
        if (elsewhere) {
          // One business at a time (docs/03); also never reveal which one.
          throw new AppError(
            HttpStatus.CONFLICT,
            'PHONE_IN_OTHER_BUSINESS',
            'This mobile number already belongs to another business on KaamSetu.',
          );
        }
      } else {
        user = await tx.user.create({
          data: { phone: input.phone, name: input.name },
          include: { memberships: true },
        });
      }
      const before = user.memberships.find((m) => m.organizationId === organizationId);
      const member = await tx.organizationMember.upsert({
        where: { organizationId_userId: { organizationId, userId: user.id } },
        create: { organizationId, userId: user.id, role: input.role },
        update: { role: input.role, status: 'ACTIVE', deactivatedAt: null },
        select: {
          id: true,
          role: true,
          status: true,
          joinedAt: true,
          user: { select: { name: true, phone: true, googleSubject: true } },
        },
      });
      await audit(tx, auth, 'EMPLOYEE_ADDED', 'OrganizationMember', member.id, {
        role: input.role,
        ...(before ? { previousRole: before.role } : {}),
      });
      // A crew works as one team: the new person joins the owner's (D-044).
      if (businessType === 'CREW') {
        await joinTeam(tx, organizationId, await ownTeam(tx, organizationId, auth.memberId as string), member);
      }
      return member;
    });
  }

  /**
   * Owner changes how the business works (D-044). Going down to SOLO or CREW
   * needs few enough employees and no open jobs outside the owner's team;
   * the other teams are then turned off (their history stays).
   */
  async changeBusinessType(auth: AuthContext, input: ChangeBusinessType) {
    const organizationId = requireOrg(auth);
    const to = input.businessType;
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { businessType: true } });
      if (org.businessType !== to) {
        if (to !== 'VENDOR') {
          const staff = await activeStaff(tx, organizationId);
          if (staff > (to === 'SOLO' ? 0 : CREW_EMPLOYEE_LIMIT)) {
            throw new AppError(
              HttpStatus.CONFLICT,
              'TOO_MANY_EMPLOYEES',
              to === 'SOLO'
                ? 'Remove your employees first: working alone means no employees.'
                : 'Keep only one employee first: a two-person business has one.',
            );
          }
          const teamId = await ownTeam(tx, organizationId, auth.memberId as string);
          const open = await tx.serviceJob.count({
            where: {
              organizationId,
              status: { in: [...OPEN_JOB] },
              OR: [{ assignedTeamId: null }, { assignedTeamId: { not: teamId } }],
            },
          });
          if (open > 0) {
            throw new AppError(
              HttpStatus.CONFLICT,
              'OPEN_JOBS_ON_OTHER_TEAMS',
              'Give the open jobs to your own team, finish or cancel them first.',
            );
          }
          await tx.team.updateMany({ where: { organizationId, active: true, id: { not: teamId } }, data: { active: false } });
          const left = await tx.organizationMember.findFirst({
            where: { organizationId, status: 'ACTIVE', role: { not: 'OWNER' } },
            select: { id: true, role: true },
          });
          if (left) await joinTeam(tx, organizationId, teamId, left);
        }
        await tx.organization.update({ where: { id: organizationId }, data: { businessType: to } });
        await audit(tx, auth, 'BUSINESS_TYPE_CHANGED', 'Organization', organizationId, { from: org.businessType, to });
      }
      return { businessType: to, features: featuresFor(to) };
    });
  }
}
