import type { AuthContext } from '../auth/token.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { requireOrg } from '../tenancy/tenant.js';

/** Actions kept in the audit log (docs/10 §5). */
export type AuditAction =
  | 'EMPLOYEE_ADDED'
  | 'EMPLOYEE_REMOVED'
  | 'LOGIN_RESET'
  | 'BILL_ISSUED'
  | 'BILL_CANCELLED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_VOIDED'
  | 'CASH_CONFIRMED'
  | 'CASH_REJECTED';

type Db = Pick<Prisma.TransactionClient, 'auditLog'>;

/**
 * Adds one audit row for the signed-in person's business. Pass the
 * transaction client so the row is saved only if the change is.
 *
 * @example await audit(tx, auth, 'PAYMENT_VOIDED', 'Payment', id, { reason });
 */
export function audit(
  db: Db,
  auth: AuthContext,
  action: AuditAction,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonObject,
) {
  return db.auditLog.create({
    data: { organizationId: requireOrg(auth), actorUserId: auth.userId, action, entityType, entityId, metadata },
  });
}
