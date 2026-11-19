import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 60;

/** What every authenticated request knows about the caller (docs/10 §1). */
export interface AuthContext {
  userId: string;
  deviceId: string;
  /** Null until the user creates or joins a business. */
  organizationId: string | null;
  memberId: string | null;
  role: 'OWNER' | 'SENIOR_TECHNICIAN' | 'HELPER' | null;
}

interface AccessPayload {
  sub: string;
  did: string;
  org: string | null;
  mem: string | null;
  role: AuthContext['role'];
}

export interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  auth: AuthContext;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const unauthorized = (code: string, message: string) =>
  new AppError(HttpStatus.UNAUTHORIZED, code, message);

@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Creates a device for a fresh login and returns its first token pair. */
  async loginNewDevice(
    userId: string,
    device: { platform: string; label?: string },
  ): Promise<IssuedTokens> {
    const created = await this.prisma.device.create({
      data: { userId, platform: device.platform, label: device.label },
    });
    return this.issue(userId, created.id);
  }

  /**
   * Swaps a refresh token for a new pair. Each refresh token works once; using
   * one twice means it was copied, so the whole device is signed out.
   */
  async refresh(rawToken: string): Promise<IssuedTokens> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(rawToken) },
      include: { device: true },
    });
    if (!stored) throw unauthorized('REFRESH_INVALID', 'Please log in again.');

    if (stored.usedAt) {
      await this.revokeDevice(stored.deviceId);
      throw unauthorized('REFRESH_REUSED', 'Please log in again.');
    }
    if (stored.expiresAt <= new Date() || stored.device.revokedAt) {
      throw unauthorized('REFRESH_INVALID', 'Please log in again.');
    }

    const marked = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (marked.count !== 1) {
      await this.revokeDevice(stored.deviceId);
      throw unauthorized('REFRESH_REUSED', 'Please log in again.');
    }
    await this.prisma.device.update({
      where: { id: stored.deviceId },
      data: { lastSeenAt: new Date() },
    });
    return this.issue(stored.device.userId, stored.deviceId);
  }

  async revokeDevice(deviceId: string): Promise<void> {
    await this.prisma.device.updateMany({
      where: { id: deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Verifies an access token and checks the device, user and membership are still active. */
  async authenticate(accessToken: string): Promise<AuthContext> {
    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(accessToken);
    } catch {
      throw unauthorized('UNAUTHENTICATED', 'Please log in again.');
    }

    const device = await this.prisma.device.findUnique({
      where: { id: payload.did },
      include: { user: true },
    });
    if (
      !device ||
      device.revokedAt ||
      device.userId !== payload.sub ||
      device.user.status !== 'ACTIVE'
    ) {
      throw unauthorized('UNAUTHENTICATED', 'Please log in again.');
    }

    if (payload.mem) {
      const member = await this.prisma.organizationMember.findUnique({
        where: { id: payload.mem },
      });
      if (
        !member ||
        member.status !== 'ACTIVE' ||
        member.organizationId !== payload.org
      ) {
        throw unauthorized('UNAUTHENTICATED', 'Please log in again.');
      }
    }

    return {
      userId: payload.sub,
      deviceId: payload.did,
      organizationId: payload.org,
      memberId: payload.mem,
      role: payload.role,
    };
  }

  private async issue(userId: string, deviceId: string): Promise<IssuedTokens> {
    // One active business at a time (docs/03 §2): the earliest active membership.
    const member = await this.prisma.organizationMember.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { joinedAt: 'asc' },
    });
    const auth: AuthContext = {
      userId,
      deviceId,
      organizationId: member?.organizationId ?? null,
      memberId: member?.id ?? null,
      role: member?.role ?? null,
    };
    const payload: AccessPayload = {
      sub: userId,
      did: deviceId,
      org: auth.organizationId,
      mem: auth.memberId,
      role: auth.role,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });

    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        deviceId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      },
    });
    return {
      accessToken,
      accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
      auth,
    };
  }
}
