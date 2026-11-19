import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { AppError } from '../common/app-error.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OtpSender } from './otp-sender.js';

/** Limits from docs/10 §1. */
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 3;
export const OTP_SEND_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class OtpService {
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: OtpSender,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('OTP_HASH_SECRET');
  }

  /** Sends a new code. Earlier unused codes for the phone stop working. */
  async request(phone: string): Promise<{ expiresInSeconds: number }> {
    const since = new Date(Date.now() - OTP_SEND_WINDOW_SECONDS * 1000);
    const recent = await this.prisma.otpChallenge.count({
      where: { phone, createdAt: { gte: since } },
    });
    if (recent >= OTP_MAX_SENDS) {
      throw new AppError(
        HttpStatus.TOO_MANY_REQUESTS,
        'OTP_SEND_LIMIT',
        'Too many codes sent. Please wait 15 minutes and try again.',
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.otpChallenge.updateMany({
        where: { phone, consumedAt: null, expiresAt: { gt: now } },
        data: { expiresAt: now },
      }),
      this.prisma.otpChallenge.create({
        data: {
          phone,
          codeHash: this.hash(phone, code),
          expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
        },
      }),
    ]);
    await this.sender.send(phone, code);
    return { expiresInSeconds: OTP_TTL_SECONDS };
  }

  /** Checks a code. Succeeds at most once per code. */
  async verify(phone: string, code: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'OTP_EXPIRED',
        'This code has expired. Ask for a new one.',
      );
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        HttpStatus.TOO_MANY_REQUESTS,
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many wrong codes. Ask for a new one.',
      );
    }

    const expected = Buffer.from(challenge.codeHash, 'hex');
    const given = Buffer.from(this.hash(phone, code), 'hex');
    if (!timingSafeEqual(expected, given)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'OTP_INVALID',
        'Wrong code. Please check and try again.',
      );
    }

    // Only one request can consume the code, even if two arrive together.
    const consumed = await this.prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        'OTP_EXPIRED',
        'This code has expired. Ask for a new one.',
      );
    }
  }

  private hash(phone: string, code: string): string {
    return createHmac('sha256', this.secret)
      .update(`${phone}:${code}`)
      .digest('hex');
  }
}
