import type { SqlDatabase, SqlValue } from '@/db/sql';

/** docs/09 §5. */
export type OutboxState = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED_RETRYABLE' | 'NEEDS_ATTENTION';

export type OutboxOperation = {
  /** Operation UUID, also the idempotency key. */
  id: string;
  organizationId: string | null;
  entityType: string;
  entityId: string;
  /** e.g. `job.start`, `job.update`, `attachment.upload`. */
  operation: string;
  payload: unknown;
  baseVersion: number | null;
  dependsOn: string | null;
  createdAt: string;
  state: OutboxState;
  attempts: number;
  lastErrorCode: string | null;
  /** Epoch ms; not sent before this. */
  nextAttemptAt: number;
};

export type NewOperation = Pick<OutboxOperation, 'id' | 'entityType' | 'entityId' | 'operation'> & {
  payload: unknown;
  organizationId?: string | null;
  baseVersion?: number | null;
  dependsOn?: string | null;
};

/** Sent operations are kept this long, then pruned (docs/09 §3: 7 days, tunable). */
export const SENT_RETENTION_MS = 7 * 24 * 3600_000;

/** Retry delays after the 1st, 2nd, 3rd… failure: 5 s, 30 s, 2 min, 10 min, then every 10 min. */
export const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000] as const;
export function backoffMs(attempts: number): number {
  return BACKOFF_MS[Math.min(Math.max(attempts, 1), BACKOFF_MS.length) - 1];
}

type Row = {
  id: string;
  organization_id: string | null;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload: string;
  base_version: number | null;
  depends_on: string | null;
  created_at: string;
  state: OutboxState;
  attempts: number;
  last_error_code: string | null;
  next_attempt_at: number;
};

function fromRow(r: Row): OutboxOperation {
  return {
    id: r.id,
    organizationId: r.organization_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    operation: r.operation,
    payload: JSON.parse(r.payload),
    baseVersion: r.base_version,
    dependsOn: r.depends_on,
    createdAt: r.created_at,
    state: r.state,
    attempts: r.attempts,
    lastErrorCode: r.last_error_code,
    nextAttemptAt: r.next_attempt_at,
  };
}

/**
 * The outbox table. Rows are never deleted by sending: SENT rows stay for
 * the retention window (docs/09 §3), NEEDS_ATTENTION rows until someone acts.
 */
export class Outbox {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  private iso(): string {
    return new Date(this.now()).toISOString();
  }

  /**
   * Adds an operation. Call it inside the same transaction as the local
   * record change (`db.withTransactionAsync`) so both are saved or neither.
   */
  async enqueue(op: NewOperation): Promise<void> {
    const at = this.iso();
    await this.db.runAsync(
      `INSERT INTO outbox (id, organization_id, entity_type, entity_id, operation, payload,
         base_version, depends_on, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        op.id,
        op.organizationId ?? null,
        op.entityType,
        op.entityId,
        op.operation,
        JSON.stringify(op.payload ?? null),
        op.baseVersion ?? null,
        op.dependsOn ?? null,
        at,
        at,
      ],
    );
  }

  async get(id: string): Promise<OutboxOperation | null> {
    const row = await this.db.getFirstAsync<Row>('SELECT * FROM outbox WHERE id = ?', [id]);
    return row ? fromRow(row) : null;
  }

  /**
   * After an app kill, rows left in SENDING may or may not have reached the
   * server. Send them again: the server treats a repeated id as a duplicate.
   */
  async recoverInterrupted(): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox SET state = 'FAILED_RETRYABLE', next_attempt_at = 0, updated_at = ?
       WHERE state = 'SENDING'`,
      [this.iso()],
    );
  }

  /**
   * The next operation that may be sent now: oldest first; not before its
   * retry time; only after the operation it depends on is SENT; and only
   * when every earlier operation on the same record is SENT (per-record order).
   */
  async nextReady(): Promise<OutboxOperation | null> {
    const row = await this.db.getFirstAsync<Row>(
      `SELECT o.* FROM outbox o
       WHERE o.state IN ('PENDING', 'FAILED_RETRYABLE')
         AND o.next_attempt_at <= ?
         AND (o.depends_on IS NULL OR NOT EXISTS (
               SELECT 1 FROM outbox d WHERE d.id = o.depends_on AND d.state <> 'SENT'))
         AND NOT EXISTS (
               SELECT 1 FROM outbox e
               WHERE e.entity_type = o.entity_type AND e.entity_id = o.entity_id
                 AND e.seq < o.seq AND e.state <> 'SENT')
       ORDER BY o.seq
       LIMIT 1`,
      [this.now()],
    );
    return row ? fromRow(row) : null;
  }

  /**
   * Earliest future retry time, or null. Rows already due but blocked (by an
   * earlier operation or a dependency) are not counted: they move when that
   * blocker does, on the next trigger.
   */
  async nextRetryAt(): Promise<number | null> {
    const row = await this.db.getFirstAsync<{ at: number | null }>(
      `SELECT MIN(next_attempt_at) AS at FROM outbox
       WHERE state IN ('PENDING', 'FAILED_RETRYABLE') AND next_attempt_at > ?`,
      [this.now()],
    );
    return row?.at ?? null;
  }

  async markSending(id: string): Promise<void> {
    await this.setState(id, 'SENDING');
  }

  async markSent(id: string): Promise<void> {
    await this.setState(id, 'SENT', ', last_error_code = NULL');
  }

  /** Network/5xx: wait and try again with backoff. */
  async markRetry(id: string, errorCode: string): Promise<void> {
    const op = await this.get(id);
    const attempts = (op?.attempts ?? 0) + 1;
    await this.db.runAsync(
      `UPDATE outbox SET state = 'FAILED_RETRYABLE', attempts = ?, last_error_code = ?,
         next_attempt_at = ?, updated_at = ? WHERE id = ?`,
      [attempts, errorCode, this.now() + backoffMs(attempts), this.iso(), id],
    );
  }

  /** 4xx validation/permission or a conflict: never dropped, shown as "Needs attention". */
  async markNeedsAttention(id: string, errorCode: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox SET state = 'NEEDS_ATTENTION', attempts = attempts + 1, last_error_code = ?,
         updated_at = ? WHERE id = ?`,
      [errorCode, this.iso(), id],
    );
  }

  /**
   * Removes operations the server accepted more than `keepMs` ago (docs/09
   * §3 retention). Unsent and NEEDS_ATTENTION rows are never removed.
   * Returns how many rows were deleted.
   */
  async prune(keepMs: number = SENT_RETENTION_MS): Promise<number> {
    const cutoff = new Date(this.now() - keepMs).toISOString();
    const before = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM outbox WHERE state = 'SENT' AND updated_at < ?`,
      [cutoff],
    );
    await this.db.runAsync(`DELETE FROM outbox WHERE state = 'SENT' AND updated_at < ?`, [cutoff]);
    return before?.n ?? 0;
  }

  /** Operations on one record that the server has not accepted yet, oldest first. */
  async unsentFor(entityType: string, entityId: string): Promise<OutboxOperation[]> {
    const rows = await this.db.getAllAsync<Row>(
      `SELECT * FROM outbox WHERE entity_type = ? AND entity_id = ? AND state <> 'SENT' ORDER BY seq`,
      [entityType, entityId],
    );
    return rows.map(fromRow);
  }

  /** Unsent operations of these kinds (e.g. the owner's offline saves), oldest first. */
  async unsentOf(operations: readonly string[]): Promise<OutboxOperation[]> {
    if (operations.length === 0) return [];
    const rows = await this.db.getAllAsync<Row>(
      `SELECT * FROM outbox WHERE operation IN (${operations.map(() => '?').join(', ')}) AND state <> 'SENT' ORDER BY seq`,
      [...operations],
    );
    return rows.map(fromRow);
  }

  /** Every operation on one record still on the phone (sent ones too), oldest first. */
  async allFor(entityType: string, entityId: string): Promise<OutboxOperation[]> {
    const rows = await this.db.getAllAsync<Row>(
      `SELECT * FROM outbox WHERE entity_type = ? AND entity_id = ? ORDER BY seq`,
      [entityType, entityId],
    );
    return rows.map(fromRow);
  }

  /**
   * "Got it" on a refused operation: the server already kept its body for the
   * owner (docs/09 §7), so the phone may let it go. Only NEEDS_ATTENTION rows.
   */
  async dismissRefused(entityType: string, entityId: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM outbox WHERE entity_type = ? AND entity_id = ? AND state = 'NEEDS_ATTENTION'`,
      [entityType, entityId],
    );
  }

  /** Business switch: work queued for the old business can no longer be sent. */
  async clear(): Promise<void> {
    await this.db.runAsync('DELETE FROM outbox', []);
  }

  /** Saved on this phone but not yet accepted by the server. */
  async unsentCount(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM outbox WHERE state <> 'SENT'`,
      [],
    );
    return row?.n ?? 0;
  }

  private async setState(id: string, state: OutboxState, extra = ''): Promise<void> {
    const params: SqlValue[] = [state, this.iso(), id];
    await this.db.runAsync(
      `UPDATE outbox SET state = ?, updated_at = ?${extra} WHERE id = ?`,
      params,
    );
  }
}
