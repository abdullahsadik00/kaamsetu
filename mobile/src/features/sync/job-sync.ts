import type { JobStore, StoredJob, SyncScope } from './job-store';
import { sameScope } from './job-store';
import type { Outbox } from './outbox';

/** `GET /sync/bootstrap` (docs/09 §6). */
export type BootstrapAnswer<J> = { cursor: string; jobs: J[] };
/** `GET /sync/changes?cursor=`: `reset` means the cursor is not usable any more: bootstrap again. */
export type ChangesAnswer<J> = { cursor: string; jobs: J[]; removed: string[]; more: boolean; reset: boolean };

export type PullApi<J> = {
  bootstrap(): Promise<BootstrapAnswer<J>>;
  changes(cursor: string): Promise<ChangesAnswer<J>>;
};

/** Where a job moves when the server accepts an operation on it. */
export const OP_STATUS: Record<string, string> = {
  'job.start': 'IN_PROGRESS',
  'job.hold': 'ON_HOLD',
  'job.complete': 'COMPLETED',
};

/** Only field staff pull jobs; the owner's phone only sends its outbox. */
const PULL_ROLES = ['SENIOR_TECHNICIAN', 'HELPER'];

/** Safety stop for one pull (200 jobs a page on the server). */
const MAX_PAGES = 50;

export type SyncOutcome = { ok: true } | { ok: false; error: unknown };

type Deps<J extends StoredJob> = {
  store: JobStore<J>;
  outbox: Outbox;
  api: PullApi<J>;
  /** Sends the outbox (the OutboxSender's trigger); resolves when this pass is done. */
  push: () => Promise<void>;
  /** The signed-in person now; null while signed out. */
  scope: () => SyncScope | null;
  /** Local jobs or sync state changed (the UI re-reads the store). */
  onChange?: () => void;
};

/**
 * One sync (T4.9, D-035): send the outbox first, then pull the person's jobs
 * from the saved cursor (bootstrap when there is none or the server asks for
 * it). Never two at once: a call during a run waits for it and causes one
 * more pass, so nothing asked for is missed.
 */
export class JobSync<J extends StoredJob> {
  private running: Promise<SyncOutcome> | null = null;
  private again = false;

  constructor(private readonly deps: Deps<J>) {}

  run(): Promise<SyncOutcome> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      let outcome: SyncOutcome;
      try {
        do {
          this.again = false;
          outcome = await this.once();
        } while (this.again);
        return outcome;
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  /** True while a sync is running (for the pull-to-refresh spinner). */
  get busy(): boolean {
    return this.running !== null;
  }

  /**
   * A different person or business than the stored data was synced for:
   * clear it before anything is shown or sent. A new business also drops
   * the old business's queued work (it cannot be sent with this login).
   */
  async checkScope(): Promise<SyncScope | null> {
    const { store, outbox } = this.deps;
    const scope = this.deps.scope();
    if (!scope) return null;
    const stored = await store.scope();
    if (sameScope(stored, scope)) return scope;
    if (stored) {
      await store.clear();
      if (stored.organizationId !== scope.organizationId || stored.memberId !== scope.memberId) await outbox.clear();
    }
    await store.setScope(scope);
    this.deps.onChange?.();
    return scope;
  }

  private async once(): Promise<SyncOutcome> {
    try {
      const scope = await this.checkScope();
      if (!scope) return { ok: true };
      await this.deps.push();
      this.deps.onChange?.();
      if (PULL_ROLES.includes(scope.role)) await this.pull();
      await this.deps.store.prune();
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    } finally {
      this.deps.onChange?.();
    }
  }

  private async pull(): Promise<void> {
    const { store, api } = this.deps;
    let cursor = await store.cursor();
    if (!cursor) return this.bootstrap();
    for (let page = 0; page < MAX_PAGES; page++) {
      const answer = await api.changes(cursor);
      if (answer.reset) return this.bootstrap();
      await store.upsert(answer.jobs);
      await store.remove(answer.removed);
      // The cursor moves only after the page is stored: a crash before this repeats the page (upserts are safe).
      await store.setCursor(answer.cursor);
      cursor = answer.cursor;
      if (!answer.more) return;
    }
  }

  private async bootstrap(): Promise<void> {
    const { store, api } = this.deps;
    const answer = await api.bootstrap();
    await store.replaceAll(answer.jobs);
    await store.setCursor(answer.cursor);
  }
}
