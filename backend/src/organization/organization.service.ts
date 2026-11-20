import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg } from '../tenancy/tenant.js';
import type {
  CreateEmployee,
  CreateOrganization,
  UpdateOrganization,
} from './organization.schemas.js';

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
          subscription: {
            create: {
              currentPeriodEnd: trialEnd,
              trialEndsAt: trialEnd,
            },
          },
        },
        select: { id: true, name: true, phone: true, city: true, gstBills: true, gstin: true },
      });
      await tx.organizationMember.create({
        data: { organizationId: org.id, userId: auth.userId, role: 'OWNER' },
      });
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
    await this.prisma.$transaction([
      this.prisma.organizationMember.update({
        where: { id: member.id },
        data: { status: 'INACTIVE', deactivatedAt: member.deactivatedAt ?? now },
      }),
      this.prisma.memberInvite.updateMany({
        where: { memberId: member.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.device.updateMany({
        where: { userId: member.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
    return { removed: true };
  }

  /**
   * Owner adds a senior technician or helper. The person gets an employee
   * record now and links their Google login later via an invite (D-025).
   */
  async addEmployee(auth: AuthContext, input: CreateEmployee) {
    const organizationId = requireOrg(auth);
    return this.prisma.$transaction(async (tx) => {
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
      return tx.organizationMember.upsert({
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
    });
  }
}
