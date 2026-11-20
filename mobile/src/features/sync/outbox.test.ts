/**
 * @jest-environment node
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ApiError } from '@/api/errors';
import { migrate, MIGRATIONS } from '@/db/migrations';
import { openNodeDatabase, type NodeSqlDatabase } from '@/db/node-sqlite.testing';

import { backoffMs, Outbox, SENT_RETENTION_MS, type NewOperation } from './outbox';
import { OutboxSender, type SendResult, type Transport } from './outbox-sender';

let dir: string;
let file: string;
let db: NodeSqlDatabase;
let clock: number;
const now = () => clock;

async function openDb(): Promise<NodeSqlDatabase> {
  const d = openNodeDatabase(file);
  await migrate(d);
  return d;
}

function op(id: string, extra: Partial<NewOperation> = {}): NewOperation {
  return {
    id,
    entityType: 'ServiceJob',
    entityId: 'job-1',
    operation: 'job.update',
    payload: { note: id },
    ...extra,
  };
}

/** A transport scripted per call; records what was sent. */
function scripted(...steps: (SendResult | Error)[]) {
  const sent: string[] = [];
  const transport: Transport = async (o) => {
    sent.push(o.id);
    const step = steps.shift() ?? { result: 'applied' };
    if (step instanceof Error) throw step;
    return step;
  };
  return { transport, sent };
}

function sender(outbox: Outbox, transport: Transport) {
  // Timers are driven by the test (it calls trigger() after moving the clock).
  return new OutboxSender({ outbox, transport, now, setTimer: () => 1, clearTimer: () => {} });
}

const offline = () => new ApiError(0, 'NETWORK_ERROR', 'offline');

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'ks-outbox-'));
  file = join(dir, 'test.db');
  clock = 1_700_000_000_000;
  db = await openDb();
});

afterEach(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('migrations', () => {
  it('apply once and record the version', async () => {
    const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
    expect(v?.user_version).toBe(MIGRATIONS.length);
    await expect(migrate(db)).resolves.toBe(MIGRATIONS.length); // re-run is a no-op
  });
});

describe('outbox', () => {
  it('survives an app restart and is sent after it', async () => {
    await new Outbox(db, now).enqueue(op('op-1'));
    db.close(); // app killed

    db = await openDb(); // app opened again
    const outbox = new Outbox(db, now);
    expect(await outbox.unsentCount()).toBe(1);
    const { transport, sent } = scripted({ result: 'applied' });
    await sender(outbox, transport).start();

    expect(sent).toEqual(['op-1']);
    expect((await outbox.get('op-1'))?.state).toBe('SENT');
    expect(await outbox.unsentCount()).toBe(0);
  });

  it('resends an operation that was in flight when the app was killed', async () => {
    const before = new Outbox(db, now);
    await before.enqueue(op('op-1'));
    await before.markSending('op-1');
    db.close();

    db = await openDb();
    const outbox = new Outbox(db, now);
    const { transport, sent } = scripted({ result: 'duplicate' }); // server had it already
    await sender(outbox, transport).start();

    expect(sent).toEqual(['op-1']);
    expect((await outbox.get('op-1'))?.state).toBe('SENT');
  });

  it('keeps the local record and the outbox row together in one transaction', async () => {
    await db.execAsync('CREATE TABLE note (id TEXT PRIMARY KEY)');
    const outbox = new Outbox(db, now);
    await expect(
      db.withTransactionAsync(async () => {
        await db.runAsync('INSERT INTO note (id) VALUES (?)', ['n1']);
        await outbox.enqueue(op('op-1'));
        throw new Error('crash before commit');
      }),
    ).rejects.toThrow('crash');
    expect(await outbox.unsentCount()).toBe(0);
    expect(await db.getAllAsync('SELECT * FROM note', [])).toEqual([]);
  });

  it('retries network failures with backoff (5 s, 30 s, …) and sends when due', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('op-1'));
    const { transport, sent } = scripted(offline(), new ApiError(503, 'INTERNAL_ERROR', 'down'));
    const s = sender(outbox, transport);

    await s.start();
    let row = await outbox.get('op-1');
    expect(row).toMatchObject({ state: 'FAILED_RETRYABLE', attempts: 1, lastErrorCode: 'NETWORK_ERROR' });
    expect(row?.nextAttemptAt).toBe(clock + 5_000);

    clock += 4_999;
    await s.trigger();
    expect(sent).toHaveLength(1); // not due yet

    clock += 1;
    await s.trigger(); // 503 this time
    row = await outbox.get('op-1');
    expect(row).toMatchObject({ state: 'FAILED_RETRYABLE', attempts: 2 });
    expect(row?.nextAttemptAt).toBe(clock + 30_000);

    clock += 30_000;
    await s.trigger();
    expect(sent).toEqual(['op-1', 'op-1', 'op-1']);
    expect((await outbox.get('op-1'))?.state).toBe('SENT');
  });

  it('caps the backoff at 10 minutes', () => {
    expect([1, 2, 3, 4, 5, 20].map(backoffMs)).toEqual([
      5_000, 30_000, 120_000, 600_000, 600_000, 600_000,
    ]);
  });

  it('marks NEEDS_ATTENTION on a 4xx and does not retry it', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('op-1'));
    const { transport, sent } = scripted(new ApiError(422, 'VALIDATION_FAILED', 'bad'));
    const s = sender(outbox, transport);

    await s.start();
    expect(await outbox.get('op-1')).toMatchObject({
      state: 'NEEDS_ATTENTION',
      lastErrorCode: 'VALIDATION_FAILED',
    });

    clock += 3_600_000;
    await s.trigger();
    expect(sent).toEqual(['op-1']);
    expect(await outbox.unsentCount()).toBe(1); // never silently dropped
  });

  it('marks NEEDS_ATTENTION when the server rejects or reports a conflict', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('op-1', { entityId: 'a' }));
    await outbox.enqueue(op('op-2', { entityId: 'b' }));
    const { transport } = scripted(
      { result: 'rejected', code: 'JOB_NOT_ACCESSIBLE' },
      { result: 'conflict', code: 'VERSION_CONFLICT' },
    );
    await sender(outbox, transport).start();
    expect((await outbox.get('op-1'))?.lastErrorCode).toBe('JOB_NOT_ACCESSIBLE');
    expect((await outbox.get('op-2'))?.state).toBe('NEEDS_ATTENTION');
  });

  it('retries a 401 instead of discarding work when the login has lapsed', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('op-1'));
    const { transport } = scripted(new ApiError(401, 'UNAUTHENTICATED', 'log in'));
    await sender(outbox, transport).start();
    expect((await outbox.get('op-1'))?.state).toBe('FAILED_RETRYABLE');
  });

  it('sends in creation order per record and waits for dependencies', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('photo', { entityType: 'Attachment', entityId: 'p1' }));
    await outbox.enqueue(op('job-a', { dependsOn: 'photo' }));
    await outbox.enqueue(op('job-b'));
    await outbox.enqueue(op('other-job', { entityId: 'job-2' }));

    // Photo upload fails (offline), so the job's operations must wait.
    const { transport, sent } = scripted(offline());
    const s = sender(outbox, transport);
    await s.start();
    expect(sent).toEqual(['photo']);

    clock += 5_000;
    await s.trigger();
    expect(sent).toEqual(['photo', 'photo', 'job-a', 'job-b', 'other-job']);
    expect(await outbox.unsentCount()).toBe(0);
  });

  it('prunes only sent operations older than the retention window', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('old-sent', { entityId: 'a' }));
    await outbox.enqueue(op('stuck', { entityId: 'b' }));
    await outbox.enqueue(op('unsent', { entityId: 'c' }));
    await outbox.markSent('old-sent');
    await outbox.markNeedsAttention('stuck', 'VALIDATION_FAILED');

    clock += SENT_RETENTION_MS + 1;
    await outbox.enqueue(op('new-sent', { entityId: 'd' }));
    await outbox.markSent('new-sent');

    expect(await outbox.prune()).toBe(1);
    expect(await outbox.get('old-sent')).toBeNull();
    expect(await outbox.get('new-sent')).not.toBeNull();
    expect((await outbox.get('stuck'))?.state).toBe('NEEDS_ATTENTION'); // never dropped
    expect((await outbox.get('unsent'))?.state).toBe('PENDING');
  });

  it('holds later operations on a record behind one that needs attention', async () => {
    const outbox = new Outbox(db, now);
    await outbox.enqueue(op('first'));
    await outbox.enqueue(op('second'));
    const { transport, sent } = scripted(new ApiError(403, 'FORBIDDEN_ROLE', 'no'));
    await sender(outbox, transport).start();
    expect(sent).toEqual(['first']);
    expect((await outbox.get('second'))?.state).toBe('PENDING');
  });
});
