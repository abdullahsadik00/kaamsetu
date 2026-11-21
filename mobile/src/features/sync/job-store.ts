import type { SqlDatabase } from '@/db/sql';

/** The fields of a server job card the phone sorts and prunes by; the rest is kept as is. */
export type StoredJob = {
  id: string;
  jobNumber: number;
  status: string;
  scheduledDate: string | null;
  timeSlot: string | null;
  completedAt?: string | null;
};

/** What the phone is synced for: the signed-in person in one business (and their role's view). */
export type SyncScope = { organizationId: string; memberId: string; role: string };

const KEY_CURSOR = 'sync.cursor';
const KEY_SCOPE = 'sync.scope';

/** Finished jobs stay on the phone this long after they are sent (docs/09 §3). */
export const DONE_RETENTION_MS = 7 * 24 * 3600_000;

const SLOT_ORDER: Record<string, number> = { MORNING: 0, AFTERNOON: 1, EVENING: 2 };

/** Same order as the server: day, then slot, then job number; jobs with no day last. */
function compare(a: StoredJob, b: StoredJob): number {
  const da = a.scheduledDate ?? '9999-99-99';
  const db = b.scheduledDate ?? '9999-99-99';
  if (da !== db) return da < db ? -1 : 1;
  const sa = a.timeSlot ? (SLOT_ORDER[a.timeSlot] ?? 3) : 4;
  const sb = b.timeSlot ? (SLOT_ORDER[b.timeSlot] ?? 3) : 4;
  if (sa !== sb) return sa - sb;
  return a.jobNumber - b.jobNumber;
}

function fromRow<J>(r: { data: string; gone: number }): J & { gone?: boolean } {
  const job = JSON.parse(r.data) as J;
  return r.gone === 1 ? { ...job, gone: true } : job;
}

/** Jobs that still have work the server has not accepted are never dropped. */
const NO_UNSENT_WORK = `NOT EXISTS (
  SELECT 1 FROM outbox o
  WHERE o.entity_type = 'ServiceJob' AND o.entity_id = job.id AND o.state <> 'SENT')`;

/**
 * The person's jobs on the phone (docs/09 §2–3, T4.9). Field screens read
 * only from here, so they work with no internet. The sync pull writes it.
 */
export class JobStore<J extends StoredJob = StoredJob> {
  constructor(
    private readonly db: SqlDatabase,
    private readonly now: () => number = Date.now,
  ) {}

  /** All jobs on the phone, in the server's order. `gone` is set on jobs the server took away. */
  async list(): Promise<(J & { gone?: boolean })[]> {
    const rows = await this.db.getAllAsync<{ data: string; gone: number }>('SELECT data, gone FROM job', []);
    return rows.map(fromRow<J>).sort(compare);
  }

  async get(id: string): Promise<(J & { gone?: boolean }) | null> {
    const row = await this.db.getFirstAsync<{ data: string; gone: number }>('SELECT data, gone FROM job WHERE id = ?', [id]);
    return row ? fromRow<J>(row) : null;
  }

  /** Inserts or replaces jobs as the server sent them. */
  async upsert(jobs: J[]): Promise<void> {
    const at = new Date(this.now()).toISOString();
    for (const j of jobs) {
      await this.db.runAsync(
        `INSERT INTO job (id, job_number, status, scheduled_date, completed_at, gone, data, synced_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)
         ON CONFLICT (id) DO UPDATE SET job_number = excluded.job_number, status = excluded.status,
           scheduled_date = excluded.scheduled_date, completed_at = excluded.completed_at,
           gone = 0, data = excluded.data, synced_at = excluded.synced_at`,
        [j.id, j.jobNumber, j.status, j.scheduledDate, j.completedAt ?? null, JSON.stringify(j), at],
      );
    }
  }

  /**
   * The server took these jobs away (cancelled, another team, finished on an
   * earlier day). A job with unsent or refused work stays, marked gone, so the
   * technician still sees "Needs attention" and why.
   */
  async remove(ids: string[]): Promise<void> {
    for (const id of ids) await this.db.runAsync('UPDATE job SET gone = 1 WHERE id = ?', [id]);
    await this.dropGone();
  }

  /** Bootstrap: the server's list replaces the phone's (keeping jobs with unsent work). */
  async replaceAll(jobs: J[]): Promise<void> {
    await this.db.runAsync('UPDATE job SET gone = 1', []);
    await this.upsert(jobs);
    await this.dropGone();
  }

  /** Gone jobs whose work has all been sent or dismissed; finished jobs past retention. */
  async prune(): Promise<void> {
    await this.dropGone();
    const cutoff = new Date(this.now() - DONE_RETENTION_MS).toISOString();
    await this.db.runAsync(
      `DELETE FROM job WHERE status IN ('COMPLETED', 'CANCELLED')
         AND completed_at IS NOT NULL AND completed_at < ? AND ${NO_UNSENT_WORK}`,
      [cutoff],
    );
  }

  /** The server accepted an operation: move the local copy on until the next pull. */
  async setStatus(id: string, status: string): Promise<void> {
    const job = await this.get(id);
    if (!job || job.status === status) return;
    const completedAt = status === 'COMPLETED' ? new Date(this.now()).toISOString() : (job.completedAt ?? null);
    const { gone: _gone, ...card } = job;
    const next = { ...card, status, completedAt };
    await this.db.runAsync('UPDATE job SET status = ?, completed_at = ?, data = ? WHERE id = ?', [
      status,
      completedAt,
      JSON.stringify(next),
      id,
    ]);
  }

  async isGone(id: string): Promise<boolean> {
    const row = await this.db.getFirstAsync<{ gone: number }>('SELECT gone FROM job WHERE id = ?', [id]);
    return row?.gone === 1;
  }

  async cursor(): Promise<string | null> {
    return this.read(KEY_CURSOR);
  }

  async setCursor(cursor: string): Promise<void> {
    await this.write(KEY_CURSOR, cursor);
  }

  async scope(): Promise<SyncScope | null> {
    const raw = await this.read(KEY_SCOPE);
    return raw ? (JSON.parse(raw) as SyncScope) : null;
  }

  async setScope(scope: SyncScope): Promise<void> {
    await this.write(KEY_SCOPE, JSON.stringify(scope));
  }

  /** Forget every job and the cursor (next pull bootstraps). */
  async clear(): Promise<void> {
    await this.db.runAsync('DELETE FROM job', []);
    await this.db.runAsync('DELETE FROM kv WHERE key = ?', [KEY_CURSOR]);
  }

  private async dropGone(): Promise<void> {
    await this.db.runAsync(`DELETE FROM job WHERE gone = 1 AND ${NO_UNSENT_WORK}`, []);
  }

  private async read(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    return row?.value ?? null;
  }

  private async write(key: string, value: string): Promise<void> {
    await this.db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
  }
}

export function sameScope(a: SyncScope | null, b: SyncScope): boolean {
  return !!a && a.organizationId === b.organizationId && a.memberId === b.memberId && a.role === b.role;
}
