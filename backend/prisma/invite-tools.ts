import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  hashInviteValue,
  inviteQrPayload,
  newInviteCode,
  newInviteToken,
} from '../src/auth/invite-codes.js';

/** Owners cannot be invited from the app yet (no business signup, T4.1), so scripts issue a longer invite. */
export const OWNER_INVITE_DAYS = 7;

/**
 * Creates a fresh invite for an employee record (D-025) and revokes any open
 * one. Hashes with OTP_HASH_SECRET, which must equal the server's value or
 * the code shows "Wrong code" in the app.
 */
export async function issueInvite(
  prisma: PrismaClient,
  organizationId: string,
  memberId: string,
  days = OWNER_INVITE_DAYS,
): Promise<{ code: string; qr: string; expiresAt: Date }> {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error(
      'OTP_HASH_SECRET is not set. Use the same value as the server (Render › Environment).',
    );
  }
  const token = newInviteToken();
  const code = newInviteCode();
  const expiresAt = new Date(Date.now() + days * 24 * 3600_000);
  await prisma.memberInvite.updateMany({
    where: { memberId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await prisma.memberInvite.create({
    data: {
      organizationId,
      memberId,
      tokenHash: hashInviteValue(secret, token),
      codeHash: hashInviteValue(secret, code),
      expiresAt,
    },
  });
  return { code, qr: inviteQrPayload(token), expiresAt };
}
