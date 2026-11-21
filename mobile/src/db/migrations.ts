import type { SqlDatabase } from './sql';

/**
 * On-phone schema, one entry per version. Never edit a released migration;
 * add a new one. The database's `user_version` records the last one applied.
 */
export const MIGRATIONS: readonly string[] = [
  // 1: outbox (docs/09 §5) and a small key/value table for sync state (cursor etc.).
  `
  CREATE TABLE outbox (
    seq             INTEGER PRIMARY KEY AUTOINCREMENT,
    id              TEXT NOT NULL UNIQUE,
    organization_id TEXT,
    entity_type     TEXT NOT NULL,
    entity_id       TEXT NOT NULL,
    operation       TEXT NOT NULL,
    payload         TEXT NOT NULL,
    base_version    INTEGER,
    depends_on      TEXT,
    created_at      TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'PENDING'
                    CHECK (state IN ('PENDING','SENDING','SENT','FAILED_RETRYABLE','NEEDS_ATTENTION')),
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_error_code TEXT,
    next_attempt_at INTEGER NOT NULL DEFAULT 0,
    updated_at      TEXT NOT NULL
  );
  CREATE INDEX outbox_state_idx ON outbox (state, next_attempt_at);
  CREATE INDEX outbox_entity_idx ON outbox (entity_type, entity_id, seq);
  CREATE TABLE kv (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // 2: the person's jobs from the sync pull (docs/09 §6, T4.9, D-035). `data` is
  // the server's job card as JSON; the other columns are for sorting and pruning.
  // `gone` marks a job the server took away that still has unsent work on it.
  `
  CREATE TABLE job (
    id             TEXT PRIMARY KEY NOT NULL,
    job_number     INTEGER NOT NULL,
    status         TEXT NOT NULL,
    scheduled_date TEXT,
    completed_at   TEXT,
    gone           INTEGER NOT NULL DEFAULT 0,
    data           TEXT NOT NULL,
    synced_at      TEXT NOT NULL
  );
  DELETE FROM kv WHERE key = 'myJobs';
  `,
];

/** Applies pending migrations, each in its own transaction. Returns the new version. */
export async function migrate(db: SqlDatabase): Promise<number> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    const next = version + 1;
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
  return version;
}
