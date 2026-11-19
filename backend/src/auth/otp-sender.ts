import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppError } from '../common/app-error.js';
import { maskPhone } from '../common/request-context.middleware.js';

/** Delivers a one-time password. The real SMS provider is still open (Q-08). */
export abstract class OtpSender {
  abstract send(phone: string, code: string): Promise<void>;
}

/**
 * Development only: prints the code to the server console so login can be
 * tried without an SMS provider. Never used in staging or production.
 */
@Injectable()
export class DevConsoleOtpSender extends OtpSender {
  private readonly logger = new Logger('DevOtp');

  async send(phone: string, code: string): Promise<void> {
    this.logger.warn(`DEV ONLY · OTP for ${maskPhone(phone)} is ${code}`);
  }
}

/** Test environment: keeps the last code per phone so tests can log in. */
@Injectable()
export class CapturingOtpSender extends OtpSender {
  readonly sent = new Map<string, string>();

  async send(phone: string, code: string): Promise<void> {
    this.sent.set(phone, code);
  }
}

/** Staging/production until an SMS provider is chosen: refuse clearly instead of pretending. */
@Injectable()
export class SmsNotConfiguredSender extends OtpSender {
  async send(): Promise<void> {
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'SMS_NOT_CONFIGURED',
      'Login by SMS is not available yet. Please try again later.',
    );
  }
}
