import NetInfo from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '@/api/errors';
import { deleteUserDatabase, openUserDatabase } from '@/db/database';
import type { SqlDatabase } from '@/db/sql';
import { api, onLogout, useSession } from '@/features/auth/session';

import { JobStore, type StoredJob, type SyncScope } from './job-store';
import { JobSync, OP_STATUS, type BootstrapAnswer, type ChangesAnswer, type PullApi, type SyncOutcome } from './job-sync';
import { Outbox, type OutboxOperation } from './outbox';
import { OutboxSender, type SendResult } from './outbox-sender';

type BatchResponse = {
  results: { id: string; status: SendResult['result']; code?: string }[];
};

/** Sends one operation through `POST /sync/operations` (docs/09 §6). */
async function transport(op: OutboxOperation): Promise<SendResult> {
  const res = await api.post<BatchResponse>('/sync/operations', {
    operations: [
      {
        id: op.id,
        entityType: op.entityType,
        entityId: op.entityId,
        operation: op.operation,
        payload: op.payload,
        baseVersion: op.baseVersion,
        dependsOn: op.dependsOn,
        createdAt: op.createdAt,
      },
    ],
  });
  const r = res.results.find((x) => x.id === op.id);
  if (!r) return { result: 'rejected', code: 'NO_RESULT' };
  if (r.status === 'applied' || r.status === 'duplicate') return { result: r.status };
  return { result: r.status, code: r.code ?? r.status.toUpperCase() };
}

/** The sync pull (docs/09 §6, T4.9). */
const pullApi: PullApi<StoredJob> = {
  bootstrap: () => api.get<BootstrapAnswer<StoredJob>>('/sync/bootstrap'),
  changes: (cursor) => api.get<ChangesAnswer<StoredJob>>(`/sync/changes?cursor=${encodeURIComponent(cursor)}`),
};

/** Who is signed in now, as the phone's data is kept for (person + business + role). */
function currentScope(): SyncScope | null {
  const m = useSession.getState().profile?.membership;
  return m ? { organizationId: m.organizationId, memberId: m.memberId, role: m.role } : null;
}

/** While signed in and the app is in front, pull this often to pick up new jobs. */
const PULL_EVERY_MS = 60_000;

type Active = {
  userId: string;
  db: SqlDatabase;
  outbox: Outbox;
  sender: OutboxSender;
  store: JobStore;
  sync: JobSync<StoredJob>;
};
let active: Active | null = null;

/** Count of saved changes the server has not accepted yet (0 before the DB is open). */
export async function unsentCount(): Promise<number> {
  return active ? active.outbox.unsentCount() : 0;
}

/** Call after each local save: sends it right away when online, then pulls. */
export function notifyLocalSave(): void {
  void active?.sync.run();
}

/** Pull-to-refresh: one full sync (send, then pull). Resolves when it is done. */
export async function syncNow(): Promise<SyncOutcome | null> {
  return active ? active.sync.run() : null;
}

/** The user's open database (null until ready). */
export function currentDb(): SqlDatabase | null {
  return active?.db ?? null;
}

/** The open outbox, for features that queue work (null until the DB is ready). */
export function currentOutbox(): Outbox | null {
  return active?.outbox ?? null;
}

/** The person's jobs on the phone (null until the DB is ready). */
export function currentJobStore<J extends StoredJob>(): JobStore<J> | null {
  return (active?.store as JobStore<J> | undefined) ?? null;
}

function logFailure(outcome: SyncOutcome | null) {
  if (outcome && !outcome.ok && !(outcome.error instanceof ApiError && outcome.error.isNetwork)) {
    console.warn('Sync failed', outcome.error);
  }
}

/**
 * Opens the user's database and keeps it in sync while logged in (T4.9).
 * Triggers: app open, app back in front, internet back, after each local
 * save, pull-to-refresh, a business or role change, a timer while open, and
 * the outbox retry timer. JobSync makes sure only one sync runs at a time.
 */
export function SyncEngine({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    let mine: Active | null = null;
    const changed = () => {
      void queryClient.invalidateQueries({ queryKey: ['my-jobs'] });
      void queryClient.invalidateQueries({ queryKey: ['job-local'] });
    };
    const run = () => {
      if (mine) void mine.sync.run().then(logFailure);
    };

    openUserDatabase(userId)
      .then(async (db) => {
        if (cancelled) return;
        const outbox = new Outbox(db);
        const store = new JobStore(db);
        const sender = new OutboxSender({
          outbox,
          transport,
          // Accepted by the server: show the new status now, without waiting for the pull.
          onSent: async (op) => {
            if (op.entityType === 'ServiceJob' && OP_STATUS[op.operation]) await store.setStatus(op.entityId, OP_STATUS[op.operation]);
            changed();
          },
        });
        const sync = new JobSync<StoredJob>({ store, outbox, api: pullApi, push: () => sender.trigger(), scope: currentScope, onChange: changed });
        mine = { userId, db, outbox, sender, store, sync };
        active = mine;
        await outbox.prune();
        // Clear another business's data before anything is shown, then sync.
        await sync.checkScope();
        changed();
        await outbox.recoverInterrupted();
        run();
      })
      .catch((error: unknown) => console.warn('Local database could not open', error));

    // Connectivity regained (docs/09 §5): send what was saved while offline, then pull.
    let wasOffline = false;
    const net = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      if (online && wasOffline) run();
      wasOffline = !online;
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') run();
    }, PULL_EVERY_MS);
    // Business or role changed while signed in: the next sync clears and bootstraps.
    const session = useSession.subscribe((s, prev) => {
      const a = s.profile?.membership;
      const b = prev.profile?.membership;
      if (a?.organizationId !== b?.organizationId || a?.memberId !== b?.memberId || a?.role !== b?.role) run();
    });
    const unregister = onLogout(async () => {
      mine?.sender.stop();
      if (active === mine) active = null;
      mine = null;
      queryClient.removeQueries({ queryKey: ['my-jobs'] });
      queryClient.removeQueries({ queryKey: ['job-local'] });
      await deleteUserDatabase(userId);
    });

    return () => {
      cancelled = true;
      appState.remove();
      net();
      clearInterval(timer);
      session();
      unregister();
      mine?.sender.stop();
      if (active === mine) active = null;
    };
  }, [userId, queryClient]);

  return null;
}
