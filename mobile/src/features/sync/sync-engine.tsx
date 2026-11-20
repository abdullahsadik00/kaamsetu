import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { deleteUserDatabase, openUserDatabase } from '@/db/database';
import { api, onLogout } from '@/features/auth/session';

import { Outbox, type OutboxOperation } from './outbox';
import { OutboxSender, type SendResult } from './outbox-sender';

type BatchResponse = {
  results: { id: string; status: SendResult['result']; code?: string }[];
};

/**
 * Sends one operation through `POST /sync/operations` (docs/09 §6). The
 * endpoint arrives with the first offline business operation (T4.7); no
 * operations are queued before then.
 */
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

let active: { userId: string; outbox: Outbox; sender: OutboxSender } | null = null;

/** Count of saved changes the server has not accepted yet (0 before the DB is open). */
export async function unsentCount(): Promise<number> {
  return active ? active.outbox.unsentCount() : 0;
}

/** Call after each local save, so it goes out right away when online. */
export function notifyLocalSave(): void {
  void active?.sender.trigger();
}

/** The open outbox, for features that queue work (null until the DB is ready). */
export function currentOutbox(): Outbox | null {
  return active?.outbox ?? null;
}

/**
 * Opens the user's database and runs the outbox sender while logged in.
 * Triggers: app start, app back in front, internet back, after each local
 * save, retry timer. Old sent operations are pruned at start.
 */
export function SyncEngine({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let mine: OutboxSender | null = null;

    openUserDatabase(userId)
      .then(async (db) => {
        if (cancelled) return;
        const outbox = new Outbox(db);
        mine = new OutboxSender({ outbox, transport });
        active = { userId, outbox, sender: mine };
        await outbox.prune();
        await mine.start();
      })
      .catch((error: unknown) => console.warn('Local database could not open', error));

    // Connectivity regained (docs/09 §5): send what was saved while offline.
    let wasOffline = false;
    const net = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      if (online && wasOffline) void mine?.trigger();
      wasOffline = !online;
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void mine?.trigger();
    });
    const unregister = onLogout(async () => {
      mine?.stop();
      active = null;
      await deleteUserDatabase(userId);
    });

    return () => {
      cancelled = true;
      appState.remove();
      net();
      unregister();
      mine?.stop();
      if (active?.userId === userId) active = null;
    };
  }, [userId]);

  return null;
}
