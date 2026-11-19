import { HttpStatus } from '@nestjs/common';
import type { AuthContext } from '../auth/token.service.js';
import { AppError } from '../common/app-error.js';

/**
 * The caller's business ID, taken only from the verified token, never from
 * the request (docs/10 §3). Throws if the caller has no business yet.
 */
export function requireOrg(auth: AuthContext): string {
  if (!auth.organizationId) {
    throw new AppError(
      HttpStatus.FORBIDDEN,
      'NO_ORGANIZATION',
      'Set up or join a business first.',
    );
  }
  return auth.organizationId;
}

/**
 * Adds the caller's organizationId to a Prisma `where`. Use it for every
 * query on business data so a record from another business is never found.
 * An `organizationId` already in `where` is overwritten, not trusted.
 *
 * @example prisma.customer.findFirst({ where: scoped(auth, { id }) })
 */
export function scoped<W extends object>(
  auth: AuthContext,
  where?: W,
): W & { organizationId: string } {
  return { ...(where ?? ({} as W)), organizationId: requireOrg(auth) };
}
