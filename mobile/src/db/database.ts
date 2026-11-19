import * as SQLite from 'expo-sqlite';

import { migrate } from './migrations';
import type { SqlDatabase } from './sql';

/** One database per logged-in user (docs/09 §3), so a shared phone never mixes data. */
function fileName(userId: string): string {
  return `kaamsetu-${userId.replace(/[^a-zA-Z0-9-]/g, '')}.db`;
}

let open: { userId: string; db: Promise<SQLite.SQLiteDatabase> } | null = null;

/** Opens (and migrates) the user's database; reuses the open one. */
export function openUserDatabase(userId: string): Promise<SqlDatabase> {
  if (open?.userId !== userId) {
    const db = SQLite.openDatabaseAsync(fileName(userId)).then(async (d) => {
      await migrate(d);
      return d;
    });
    open = { userId, db };
  }
  return open.db;
}

/** On logout: cached data and the outbox are removed from the phone (docs/09 §3). */
export async function deleteUserDatabase(userId: string): Promise<void> {
  if (open?.userId === userId) {
    const db = await open.db.catch(() => null);
    open = null;
    await db?.closeAsync();
  }
  await SQLite.deleteDatabaseAsync(fileName(userId)).catch(() => undefined);
}
