import { ApiError } from '@/api/errors';

import type { Outbox, OutboxOperation } from './outbox';

/** Server verdict per operation (docs/09 §6). Throwing means "no verdict" (network, 5xx…). */
export type SendResult =
  | { result: 'applied' | 'duplicate' }
  | { result: 'conflict' | 'rejected'; code: string };

export type Transport = (op: OutboxOperation) => Promise<SendResult>;

type Deps = {
  outbox: Outbox;
  transport: Transport;
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

/**
 * Sends outbox operations one at a time, in order, and schedules retries.
 * Triggers (docs/09 §5): app start, app resume, after each local save, and a
 * timer for the next retry. Background sync is never relied on.
 */
export class OutboxSender {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: unknown = null;
  private stopped = false;
  private readonly now: () => number;
  private readonly setTimer: NonNullable<Deps['setTimer']>;
  private readonly clearTimer: NonNullable<Deps['clearTimer']>;

  constructor(private readonly deps: Deps) {
    this.now = deps.now ?? Date.now;
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer =
      deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  /** Call once when the app opens: resumes anything interrupted by an app kill. */
  async start(): Promise<void> {
    this.stopped = false;
    await this.deps.outbox.recoverInterrupted();
    await this.trigger();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }

  /** Send whatever is due. Concurrent calls share one run (and cause one more pass). */
  trigger(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.drain();
        } while (this.again && !this.stopped);
        await this.schedule();
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async drain(): Promise<void> {
    const { outbox, transport } = this.deps;
    while (!this.stopped) {
      const op = await outbox.nextReady();
      if (!op) return;
      await outbox.markSending(op.id);
      try {
        const res = await transport(op);
        if ('code' in res) {
          await outbox.markNeedsAttention(op.id, res.code);
        } else {
          await outbox.markSent(op.id);
        }
      } catch (error) {
        if (error instanceof ApiError && !error.isRetryable && error.status !== 401) {
          // 4xx validation/permission: a person has to look at it.
          await outbox.markNeedsAttention(op.id, error.code);
          continue;
        }
        // Network, 5xx, 429, or no valid login right now: keep it and retry later.
        // (An expired session never discards queued work, docs/10 §1.)
        await outbox.markRetry(op.id, error instanceof ApiError ? error.code : 'UNKNOWN');
        if (error instanceof ApiError && error.isNetwork) return; // offline: stop this pass
      }
    }
  }

  private async schedule(): Promise<void> {
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    if (this.stopped) return;
    const at = await this.deps.outbox.nextRetryAt();
    if (at === null) return;
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.trigger();
    }, Math.max(at - this.now(), 0));
  }
}
