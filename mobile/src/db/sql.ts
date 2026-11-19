/**
 * The part of expo-sqlite's `SQLiteDatabase` the app uses. Keeping it this
 * small lets unit tests run the same code on Node's built-in SQLite.
 */
export type SqlValue = string | number | null;

export interface SqlDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
