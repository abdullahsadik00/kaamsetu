/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ApiError } from '@/api/errors';
import { migrate } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';

import { JobStore, type StoredJob, type SyncScope } from './job-store';
import { JobSync, OP_STATUS, type ChangesAnswer, type PullApi } from './job-sync';
import { Outbox, type OutboxOperation } from './outbox';
import { OutboxSender, type SendResult } from './outbox-sender';

type Job = StoredJob & { customer: string };

let dir: string;
let db: NodeSqlDatabase;
let store: JobStore<Job>;
let outbox: Outbox;
let scope: SyncScope | null;
const senior: SyncScope = { organizationId: 'org-1', memberId: 'm-1', role: 'SENIOR_TECHNICIAN' };

const job = (id: string, extra: Partial<Job> = {}): Job => ({
  id,
  jobNumber: Number(id.replace(/\D/g, '')) || 1,
  status: 'ASSIGNED',
  scheduledDate: '2026-11-22',
  timeSlot: 'MORNING',
  completedAt: null,
  customer: `Customer ${id}`,
  ...extra,
});

/**
 * A scripted server: `GET` answers come from queues; `POST /sync/operations`
 * applies each operation id once (a repeat is a duplicate), unless `refuse` says otherwise.
 */
function fakeServer() {
  const log: string[] = [];
  const bootstraps: { cursor: string; jobs: Job[] }[] = [];
  const pages: ChangesAnswer<Job>[] = [];
  const applied = new Set<string>();
  const refuse = new Map<string, string>();
  let failNextSend = false;
  let inflight = 0;
  let maxInflight = 0;
  const track = async <T>(name: string, fn: () => T): Promise<T> => {
    inflight++;
    maxInflight = Math.max(maxInflight, inflight);
    log.push(name);
    await new Promise((r) => setTimeout(r, 1));
    try {
      return fn();
    } finally {
      inflight--;
    }
  };
  const api: PullApi<Job> = {
    bootstrap: () =>
      track('bootstrap', () => {
        const b = bootstraps.shift();
        if (!b) throw new ApiError(0, 'NETWORK_ERROR', 'offline');
        return b;
      }),
    changes: (cursor) =>
      track(`changes:${cursor}`, () => pages.shift() ?? { cursor, jobs: [], removed: [], more: false, reset: false }),
  };
  const transport = (op: OutboxOperation): Promise<SendResult> =>
    track(`send:${op.operation}`, () => {
      const code = refuse.get(op.entityId);
      if (code) return { result: 'conflict', code } as SendResult;
      const result: SendResult = applied.has(op.id) ? { result: 'duplicate' } : { result: 'applied' };
      applied.add(op.id);
      // The answer is lost on the way back: the phone must send the same id again.
      if (failNextSend) {
        failNextSend = false;
        throw new ApiError(0, 'NETWORK_ERROR', 'offline');
      }
      return result;
    });
  return {
    api,
    transport,
    log,
    bootstraps,
    pages,
    applied,
    refuse,
    loseNextAnswer: () => (failNextSend = true),
    maxInflight: () => maxInflight,
  };
}

function makeSync(server: ReturnType<typeof fakeServer>) {
  const sender = new OutboxSender({
    outbox,
    transport: server.transport,
    onSent: (op) => store.setStatus(op.entityId, OP_STATUS[op.operation]),
    setTimer: () => 1,
    clearTimer: () => {},
  });
  const sync = new JobSync<Job>({ store, outbox, api: server.api, push: () => sender.trigger(), scope: () => scope });
  return { sync, sender };
}

const save = (id: string, entityId: string, operation = 'job.start') =>
  outbox.enqueue({ id, entityType: 'ServiceJob', entityId, operation, payload: {} });

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ks-jobsync-'));
  db = openNodeDatabase(join(dir, 'test.db'));
  await migrate(db);
  store = new JobStore<Job>(db);
  outbox = new Outbox(db);
  scope = senior;
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('Pull: bootstrap and changes (T4.9)', () => {
  it('first run bootstraps: jobs stored in the server order, cursor saved', async () => {
    const server = fakeServer();
    server.bootstraps.push({
      cursor: '10',
      jobs: [job('j3', { timeSlot: 'EVENING' }), job('j2', { timeSlot: 'AFTERNOON' }), job('j1', { scheduledDate: '2026-11-21' })],
    });
    const { sync } = makeSync(server);

    await expect(sync.run()).resolves.toEqual({ ok: true });

    expect((await store.list()).map((j) => j.id)).toEqual(['j1', 'j2', 'j3']);
    expect(await store.cursor()).toBe('10');
    expect(await store.scope()).toEqual(senior);
    expect(server.log).toEqual(['bootstrap']);
  });

  it('later runs ask for changes from the saved cursor, page by page', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] });
    const { sync } = makeSync(server);
    await sync.run();

    server.pages.push(
      { cursor: '15', jobs: [job('j2')], removed: [], more: true, reset: false },
      { cursor: '18', jobs: [job('j1', { scheduledDate: '2026-11-23' })], removed: [], more: false, reset: false },
    );
    await sync.run();

    expect(server.log).toEqual(['bootstrap', 'changes:10', 'changes:15']);
    expect(await store.cursor()).toBe('18');
    expect((await store.get('j1'))?.scheduledDate).toBe('2026-11-23');
    expect((await store.list()).map((j) => j.id)).toEqual(['j2', 'j1']);
  });

  it('bootstraps again when the server says the cursor is too old', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] }, { cursor: '3', jobs: [job('j9')] });
    const { sync } = makeSync(server);
    await sync.run();
    server.pages.push({ cursor: '3', jobs: [], removed: [], more: false, reset: true });

    await sync.run();

    expect(server.log).toEqual(['bootstrap', 'changes:10', 'bootstrap']);
    expect((await store.list()).map((j) => j.id)).toEqual(['j9']);
    expect(await store.cursor()).toBe('3');
  });

  it('removals take the job off the phone; one with unsent work stays until it is sent', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1'), job('j2')] });
    const { sync } = makeSync(server);
    await sync.run();

    // j2 has work the server refused: the job must not vanish from under it.
    server.refuse.set('j2', 'JOB_CANCELLED');
    await save('op-1', 'j2');
    server.pages.push({ cursor: '12', jobs: [], removed: ['j1', 'j2'], more: false, reset: false });
    await sync.run();

    expect(await store.get('j1')).toBeNull();
    expect(await store.get('j2')).toMatchObject({ id: 'j2', gone: true });
    expect(await outbox.get('op-1')).toMatchObject({ state: 'NEEDS_ATTENTION', lastErrorCode: 'JOB_CANCELLED' });

    // "Got it": the refused work is let go and the job leaves at the next sync.
    await outbox.dismissRefused('ServiceJob', 'j2');
    await sync.run();
    expect(await store.list()).toEqual([]);
  });

  it('a pull that fails offline keeps the phone list and the cursor', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] });
    const { sync } = makeSync(server);
    await sync.run();
    server.api.changes = () => Promise.reject(new ApiError(0, 'NETWORK_ERROR', 'offline'));

    const outcome = await sync.run();

    expect(outcome.ok).toBe(false);
    expect((await store.list()).map((j) => j.id)).toEqual(['j1']);
    expect(await store.cursor()).toBe('10');
  });

  it('the owner only sends; nothing is pulled', async () => {
    scope = { ...senior, role: 'OWNER' };
    const server = fakeServer();
    const { sync } = makeSync(server);
    await save('op-1', 'j1');
    await sync.run();
    expect(server.log).toEqual(['send:job.start']);
  });
});

describe('Push before pull, conflicts and resends (T4.9)', () => {
  it('sends the outbox first, then pulls, and the local job moves on once accepted', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] });
    const { sync } = makeSync(server);
    await sync.run();

    await save('op-1', 'j1', 'job.start');
    server.api.changes = (cursor) => {
      server.log.push(`changes:${cursor}`);
      return Promise.resolve({ cursor: '11', jobs: [], removed: [], more: false, reset: false });
    };
    await sync.run();

    expect(server.log).toEqual(['bootstrap', 'send:job.start', 'changes:10']);
    expect(await outbox.get('op-1')).toMatchObject({ state: 'SENT' });
    expect((await store.get('j1'))?.status).toBe('IN_PROGRESS');
  });

  it.each(['JOB_CANCELLED', 'JOB_REASSIGNED', 'JOB_ALREADY_COMPLETED'])('a %s refusal is kept as Needs attention with its code', async (code) => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1', { status: 'IN_PROGRESS' })] });
    const { sync } = makeSync(server);
    await sync.run();
    server.refuse.set('j1', code);
    await save('op-1', 'j1', 'job.complete');

    await sync.run();

    expect(await outbox.get('op-1')).toMatchObject({ state: 'NEEDS_ATTENTION', lastErrorCode: code });
    expect((await store.get('j1'))?.status).toBe('IN_PROGRESS'); // not moved on: the server said no
  });

  it('an answer lost on the way back is resent with the same id and applied once', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1', { status: 'IN_PROGRESS' })] });
    const { sync } = makeSync(server);
    await sync.run();
    await save('op-1', 'j1', 'job.complete');
    server.loseNextAnswer();

    await sync.run();
    expect(await outbox.get('op-1')).toMatchObject({ state: 'FAILED_RETRYABLE' });
    await db.runAsync('UPDATE outbox SET next_attempt_at = 0', []); // the retry time has come
    await sync.run();

    expect(server.log.filter((l) => l.startsWith('send:'))).toEqual(['send:job.complete', 'send:job.complete']);
    expect([...server.applied]).toEqual(['op-1']);
    expect(await outbox.get('op-1')).toMatchObject({ state: 'SENT' });
    expect(await outbox.unsentCount()).toBe(0);
    expect((await store.get('j1'))?.status).toBe('COMPLETED');
  });

  it('never runs two syncs at once; a call during a run causes one more pass', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] });
    const { sync } = makeSync(server);

    const [a, b, c] = [sync.run(), sync.run(), sync.run()];
    expect(sync.busy).toBe(true);
    await Promise.all([a, b, c]);

    expect(server.maxInflight()).toBe(1);
    expect(server.log).toEqual(['bootstrap', 'changes:10']);
    expect(sync.busy).toBe(false);
  });
});

describe('Who the phone is synced for (T4.9)', () => {
  it('a business switch clears jobs, cursor and the old business’s queued work, then bootstraps', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] }, { cursor: '4', jobs: [job('k1')] });
    const { sync } = makeSync(server);
    await sync.run();
    server.refuse.set('j1', 'JOB_CANCELLED');
    await save('op-1', 'j1');
    await sync.run(); // refused → Needs attention, still on the phone
    expect(await outbox.unsentCount()).toBe(1);

    scope = { organizationId: 'org-2', memberId: 'm-9', role: 'SENIOR_TECHNICIAN' };
    await sync.run();

    expect((await store.list()).map((j) => j.id)).toEqual(['k1']);
    expect(await store.cursor()).toBe('4');
    expect(await outbox.unsentCount()).toBe(0);
    expect(await store.scope()).toEqual(scope);
  });

  it('a role change in the same business re-bootstraps but keeps queued work', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] }, { cursor: '11', jobs: [job('j1')] });
    const { sync } = makeSync(server);
    await sync.run();
    server.refuse.set('j1', 'JOB_REASSIGNED');
    await save('op-1', 'j1');
    await sync.run();

    scope = { ...senior, role: 'HELPER' };
    await sync.run();

    expect(server.log.filter((l) => l === 'bootstrap')).toHaveLength(2);
    expect(await outbox.get('op-1')).not.toBeNull();
  });

  it('signed out: nothing is sent or pulled', async () => {
    scope = null;
    const server = fakeServer();
    const { sync } = makeSync(server);
    await save('op-1', 'j1');
    await sync.run();
    expect(server.log).toEqual([]);
  });

  it('a reopened database keeps the jobs and the cursor (works offline after an app kill)', async () => {
    const server = fakeServer();
    server.bootstraps.push({ cursor: '10', jobs: [job('j1')] });
    await makeSync(server).sync.run();
    db.close();

    db = openNodeDatabase(join(dir, 'test.db'));
    await migrate(db);
    store = new JobStore<Job>(db);
    expect((await store.list()).map((j) => j.id)).toEqual(['j1']);
    expect(await store.cursor()).toBe('10');
  });
});

describe('Job store retention', () => {
  it('drops finished jobs older than 7 days once nothing is unsent', async () => {
    let clock = Date.parse('2026-11-22T10:00:00Z');
    store = new JobStore<Job>(db, () => clock);
    await store.upsert([
      job('j1', { status: 'COMPLETED', completedAt: '2026-11-10T10:00:00Z' }),
      job('j2', { status: 'COMPLETED', completedAt: '2026-11-21T10:00:00Z' }),
      job('j3', { status: 'COMPLETED', completedAt: '2026-11-09T10:00:00Z' }),
    ]);
    await save('op-3', 'j3', 'job.complete');
    clock += 1;
    await store.prune();
    expect((await store.list()).map((j) => j.id).sort()).toEqual(['j2', 'j3']);
  });
});
