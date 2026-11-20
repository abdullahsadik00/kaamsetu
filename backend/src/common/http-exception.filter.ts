import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from './app-error.js';
import { reportError } from './error-reporting.js';
import { requestIdOf } from './request-context.middleware.js';

export interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string };
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
};

/** Maps every thrown error to the API error shape from docs/06 §1. Never leaks stack traces. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const { status, body } = toErrorBody(exception, requestIdOf(req));

    if (status >= 500) {
      // Log the real cause server-side only; the client gets a generic message.
      this.logger.error(
        `${body.meta.requestId} ${req.method} ${req.path} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
      reportError(exception, {
        requestId: body.meta.requestId,
        method: req.method,
        route: req.route?.path ?? req.path,
      });
    }
    res.status(status).json(body);
  }
}

export function toErrorBody(
  exception: unknown,
  requestId: string,
): { status: number; body: ErrorBody } {
  const meta = { requestId };

  if (exception instanceof AppError) {
    const error: ErrorBody['error'] = {
      code: exception.code,
      message: exception.message,
    };
    if (exception.details !== undefined) error.details = exception.details;
    return { status: exception.status, body: { error, meta } };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const code =
      CODE_BY_STATUS[status] ??
      (status >= 500 ? 'INTERNAL_ERROR' : 'HTTP_ERROR');
    const message =
      status >= 500
        ? 'Something went wrong. Please try again.'
        : exception.message;
    return { status, body: { error: { code, message }, meta } };
  }

  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again.',
      },
      meta,
    },
  };
}
