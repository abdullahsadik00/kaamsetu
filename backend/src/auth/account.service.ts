import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthContext } from './token.service.js';

/** Days a closed business is kept before `npm run pilot -- purge-closed` removes it. */
export const CLOSED_BUSINESS_GRACE_DAYS = 30;

/**
 * "Delete my account" (privacy policy, Google Play account-deletion rule).
 *
 * - Anyone: personal details are wiped at once (name, mobile, email, Google
 *   link), every phone is signed out, open invites are cancelled. Work
 *   records a business keeps now point to "Deleted user".
 * - Owner: the business is closed too: every member is signed out, the
 *   trial/subscription is cancelled, and the business data is removed after
 *   CLOSED_BUSINESS_GRACE_DAYS by the purge command.
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async deleteAccount(auth: AuthContext): Promise<{ deleted: true; businessClosed: boolean }> {
    const now = new Date();
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: auth.userId, status: 'ACTIVE' },
    });
    const ownedOrgIds = memberships
      .filter((m) => m.role === 'OWNER')
      .map((m) => m.organizationId);

    await this.prisma.$transaction(async (tx) => {
      if (ownedOrgIds.length > 0) {
        const members = await tx.organizationMember.findMany({
          where: { organizationId: { in: ownedOrgIds } },
          select: { id: true, userId: true },
        });
        await tx.organizationMember.updateMany({
          where: { organizationId: { in: ownedOrgIds }, status: 'ACTIVE' },
          data: { status: 'INACTIVE', deactivatedAt: now },
        });
        await tx.memberInvite.updateMany({
          where: { organizationId: { in: ownedOrgIds }, usedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
        // Everyone in a closed business is signed out (unless they work elsewhere).
        const staffIds = members.map((m) => m.userId).filter((id) => id !== auth.userId);
        const stillActive = await tx.organizationMember.findMany({
          where: { userId: { in: staffIds }, status: 'ACTIVE' },
          select: { userId: true },
        });
        const busy = new Set(stillActive.map((m) => m.userId));
        await tx.device.updateMany({
          where: { userId: { in: staffIds.filter((id) => !busy.has(id)) }, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.organization.updateMany({
          where: { id: { in: ownedOrgIds } },
          data: { status: 'INACTIVE' },
        });
        await tx.subscription.updateMany({
          where: { organizationId: { in: ownedOrgIds } },
          data: { status: 'CANCELLED', currentPeriodEnd: now },
        });
      }

      // The person themself, in every business they belonged to.
      await tx.organizationMember.updateMany({
        where: { userId: auth.userId, status: 'ACTIVE' },
        data: { status: 'INACTIVE', deactivatedAt: now },
      });
      await tx.memberInvite.updateMany({
        where: { member: { userId: auth.userId }, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.device.updateMany({
        where: { userId: auth.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.user.update({
        where: { id: auth.userId },
        data: {
          name: 'Deleted user',
          phone: null,
          email: null,
          googleSubject: null,
          status: 'INACTIVE',
        },
      });
    });
    return { deleted: true, businessClosed: ownedOrgIds.length > 0 };
  }
}
