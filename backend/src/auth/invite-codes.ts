import { createHmac, randomBytes, randomInt } from 'node:crypto';

/** How long an invite works (D-025). */
export const INVITE_TTL_HOURS = 24;
/** Wrong phone + code tries before the invite stops working. */
export const INVITE_MAX_ATTEMPTS = 5;

/** Long random value carried in the QR code. */
export const newInviteToken = (): string => randomBytes(24).toString('base64url');

/** 6-digit fallback code, always used together with the employee's phone. */
export const newInviteCode = (): string =>
  String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Only HMAC hashes are stored, so a database leak does not reveal invites. */
export const hashInviteValue = (secret: string, value: string): string =>
  createHmac('sha256', secret).update(`invite:${value}`).digest('hex');

/** What the QR encodes; the app also accepts a bare token. */
export const inviteQrPayload = (token: string): string => `kaamsetu://join?t=${token}`;
