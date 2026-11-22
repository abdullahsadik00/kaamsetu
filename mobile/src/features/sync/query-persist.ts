import NetInfo from '@react-native-community/netinfo';
import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSubscribe, type PersistedClient, type Persister } from '@tanstack/react-query-persist-client';

import type { SqlDatabase } from '@/db/sql';

/**
 * Owner basic offline, reading (D-021, docs/09 §2): what the owner has already
 * loaded (jobs, customers, ACs, enquiries, bills) is kept in the user's phone
 * database and shown again after an app restart without internet.
 */

/** How long loaded screens stay on the phone; also the query cache's gcTime. */
export const KEEP_MS = 3 * 24 * 3600_000;

const KEY = 'queryCache';
/** Field staff's jobs live in their own table (T4.9); never copy them here. */
const LOCAL_ONLY = new Set(['my-jobs', 'job-local']);

/** Saves the dehydrated query cache in the `kv` table, at most once a second. */
export function sqlPersister(db: SqlDatabase, waitMs = 1000): Persister {
  let pending: PersistedClient | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const write = async (c: PersistedClient) => {
    await db.runAsync('INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [KEY, JSON.stringify(c)]);
  };
  return {
    persistClient: (c) => {
      pending = c;
      timer ??= setTimeout(() => {
        timer = null;
        const next = pending;
        pending = null;
        if (next) write(next).catch((e: unknown) => console.warn('Could not keep screens offline', e));
      }, waitMs);
    },
    restoreClient: async () => {
      const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', [KEY]);
      return row ? (JSON.parse(row.value) as PersistedClient) : undefined;
    },
    removeClient: async () => {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
      await db.runAsync('DELETE FROM kv WHERE key = ?', [KEY]);
    },
  };
}

/**
 * Restores the kept cache, then keeps it up to date. `scope` (business,
 * member, role) is the buster: a cache kept for another business or role is
 * thrown away, never shown. Returns the stop function.
 */
export async function keepQueries(queryClient: QueryClient, db: SqlDatabase, scope: string, waitMs?: number): Promise<() => void> {
  const options = {
    queryClient,
    persister: sqlPersister(db, waitMs),
    buster: scope,
    maxAge: KEEP_MS,
    dehydrateOptions: {
      shouldDehydrateQuery: (q: { state: { status: string }; queryKey: readonly unknown[] }) =>
        q.state.status === 'success' && !LOCAL_ONLY.has(String(q.queryKey[0])),
    },
  };
  await persistQueryClientRestore(options);
  return persistQueryClientSubscribe(options);
}

/** Queries pause (and keep their data) while the phone has no internet, instead of failing. */
export function followConnectivity(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)),
  );
}
