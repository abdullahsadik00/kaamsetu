import { HttpStatus } from '@nestjs/common';

/**
 * A domain error with a stable, documented code (docs/11 §4).
 * Throw this from services; the global filter turns it into
 * `{ error: { code, message, details? } }`.
 */
export class AppError extends Error {
  constructor(
    readonly status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static validation(details: unknown): AppError {
    return new AppError(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_FAILED',
      'Some fields are missing or not valid.',
      details,
    );
  }

  /** Use for records that do not exist *or* are outside the caller's scope (docs/10 §3). */
  static notFound(code = 'NOT_FOUND'): AppError {
    return new AppError(
      HttpStatus.NOT_FOUND,
      code,
      'This item is not available to your account.',
    );
  }
}
