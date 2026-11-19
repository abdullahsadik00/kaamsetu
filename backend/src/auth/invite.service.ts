import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { requireOrg, scoped } from '../tenancy/tenant.js';
import {
  hashInviteValue,
  INVITE_MAX_ATTEMPTS,
  INVITE_TTL_HOURS,
  inviteQrPayload,
  newInviteCode,
  newInviteToken,
} from './invite-codes.js';
import { TokenService } from './token.service.js';
import type { AuthContext, IssuedTokens } from './token.service.js';

export type AcceptInput = { token: string } | { phone: string; code: string };

const inviteError = (code: string, message: string, status = HttpStatus.BAD_REQUEST) =>
  new AppError(status, code, message);

/**
 * Owner invites that link a Google login to an employee record (D-025):
 * the owner creates the employee, shows a QR (or shares phone + code), and
 * the employee, signed in with Google, accepts it. No user search exists.
 */
@Injectable()
export class InviteService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('OTP_HASH_SECRET');
  }

  /** Owner only. Replaces any open invite for the employee. */
  async create(auth: AuthContext, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: scoped(auth, { id: memberId, status: 'ACTIVE' as const }),
    });
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');

    const token = newInviteToken();
    const code = newInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600_000);
    await this.prisma.$transaction([
      this.prisma.memberInvite.updateMany({
        where: { memberId, usedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.memberInvite.create({
        data: {
          organizationId: requireOrg(auth),
          memberId,
          tokenHash: hashInviteValue(this.secret, token),
          codeHash: hashInviteValue(this.secret, code),
          expiresAt,
          createdById: auth.memberId,
        },
      }),
    ]);
    return { qr: inviteQrPayload(token), code, expiresAt };
  }

  /**
   * Owner only: unlinks the employee's Google login and signs out all their
   * phones (new phone, lost account). A new invite links them again.
   */
  async resetLogin(auth: AuthContext, memberId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: scoped(auth, { id: memberId }),
    });
    if (!member) throw AppError.notFound('EMPLOYEE_NOT_FOUND');
    if (member.id === auth.memberId) {
      throw inviteError('CANNOT_RESET_SELF', 'You cannot reset your own login.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: member.userId },
        data: { googleSubject: null },
      }),
      this.prisma.device.updateMany({
        where: { userId: member.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { reset: true };
  }

  /**
   * The signed-in Google user accepts an invite. Their Google identity moves
   * onto the invited employee's user record; this phone gets a new session
   * for that record, and the temporary Google-only user is retired.
   */
  async accept(auth: AuthContext, input: AcceptInput): Promise<IssuedTokens> {
    const caller = await this.prisma.user.findUniqueOrThrow({ where: { id: auth.userId } });
    if (!caller.googleSubject) {
      throw inviteError('GOOGLE_LOGIN_REQUIRED', 'Sign in with Google first.');
    }
    const invite = await this.findOpenInvite(input);
    const member = await this.prisma.organizationMember.findUniqueOrThrow({
      where: { id: invite.memberId },
      include: { user: true },
    });
    if (member.status !== 'ACTIVE') throw this.invalid();
    const target = member.user;

    if (target.id !== caller.id) {
      if (target.googleSubject && target.googleSubject !== caller.googleSubject) {
        throw inviteError(
          'EMPLOYEE_ALREADY_LINKED',
          'This employee already uses another Google account. Ask the owner to reset the login.',
          HttpStatus.CONFLICT,
        );
      }
      const callerMemberships = await this.prisma.organizationMember.count({
        where: { userId: caller.id },
      });
      if (callerMemberships > 0) {
        throw inviteError(
          'ALREADY_IN_BUSINESS',
          'This Google account already belongs to a business.',
          HttpStatus.CONFLICT,
        );
      }
    }

    const device = await this.prisma.device.findUniqueOrThrow({ where: { id: auth.deviceId } });
    await this.prisma.$transaction(async (tx) => {
      const used = await tx.memberInvite.updateMany({
        where: { id: invite.id, usedAt: null, revokedAt: null },
        data: { usedAt: new Date() },
      });
      if (used.count !== 1) throw this.invalid(); // accepted twice at once
      if (target.id !== caller.id) {
        // Unique googleSubject: free it on the temporary user first.
        await tx.user.update({
          where: { id: caller.id },
          data: { googleSubject: null, status: 'INACTIVE' },
        });
        await tx.user.update({
          where: { id: target.id },
          data: {
            googleSubject: caller.googleSubject,
            email: target.email ?? caller.email,
            name: target.name || caller.name,
          },
        });
        await tx.device.updateMany({
          where: { userId: caller.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    });
    return this.tokens.loginNewDevice(target.id, {
      platform: device.platform,
      label: device.label ?? undefined,
    });
  }

  private invalid() {
    return inviteError(
      'INVITE_INVALID',
      'This invite does not work. Ask the owner for a new one.',
    );
  }

  private async findOpenInvite(input: AcceptInput) {
    const now = new Date();
    if ('token' in input) {
      const invite = await this.prisma.memberInvite.findUnique({
        where: { tokenHash: hashInviteValue(this.secret, input.token) },
      });
      if (!invite || invite.usedAt || invite.revokedAt) throw this.invalid();
      if (invite.expiresAt <= now) {
        throw inviteError('INVITE_EXPIRED', 'This invite has expired. Ask the owner for a new one.');
      }
      return invite;
    }

    // Phone + code: the newest open invite for that phone's employee records.
    const invite = await this.prisma.memberInvite.findFirst({
      where: { member: { user: { phone: input.phone } }, usedAt: null, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!invite) throw this.invalid();
    if (invite.expiresAt <= now) {
      throw inviteError('INVITE_EXPIRED', 'This invite has expired. Ask the owner for a new one.');
    }
    if (invite.attempts >= INVITE_MAX_ATTEMPTS) {
      throw inviteError(
        'INVITE_TOO_MANY_ATTEMPTS',
        'Too many wrong codes. Ask the owner for a new invite.',
      );
    }
    if (invite.codeHash !== hashInviteValue(this.secret, input.code)) {
      await this.prisma.memberInvite.update({
        where: { id: invite.id },
        data: { attempts: { increment: 1 } },
      });
      throw inviteError('INVITE_CODE_WRONG', 'Wrong code. Please check and try again.');
    }
    return invite;
  }
}
