// Test-only: runs the app's SQL on Node's built-in SQLite (Node 22.5+), so
// outbox tests use a real database file and can "restart" by reopening it.
import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from './sql';

export type NodeSqlDatabase = SqlDatabase & { close(): void };

export function openNodeDatabase(path: string): NodeSqlDatabase {
  const db = new DatabaseSync(path);
  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params: SqlValue[]) {
      return db.prepare(sql).run(...params);
    },
    async getAllAsync<T>(sql: string, params: SqlValue[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: SqlValue[]) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
