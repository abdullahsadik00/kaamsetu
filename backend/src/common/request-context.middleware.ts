import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const HEADER = 'x-request-id';
const VALID_ID = /^[A-Za-z0-9-]{8,64}$/;
const logger = new Logger('Request');

type WithRequestId = Request & { requestId?: string };

export function requestIdOf(req: Request): string {
  return (req as WithRequestId).requestId ?? 'unknown';
}

/**
 * Gives every request an ID (reusing a sane incoming X-Request-Id), echoes it
 * in the response header, and logs one line per request when it finishes.
 * Logs only method, path, status and duration: never bodies, query strings,
 * tokens or phone numbers (docs/10 §4, docs/11 §6).
 */
export function requestContext(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header(HEADER);
  const requestId =
    incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  (req as WithRequestId).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
    logger.log({
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
    });
  });
  next();
}

/** Masks a phone number to its last 4 digits for logs, e.g. "******1234". */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length <= 4
    ? '****'
    : '*'.repeat(digits.length - 4) + digits.slice(-4);
}
