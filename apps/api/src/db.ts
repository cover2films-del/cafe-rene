import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
export interface DB {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function openDB(path = process.env.DATA_DIR || 'work/database'): Promise<DB> {
  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const wrap = (client: pg.Pool | pg.PoolClient): DB => ({
      query: async (sql, p) =>
        client.query(
          sql,
          p?.map((value) => (Array.isArray(value) ? JSON.stringify(value) : value)),
        ),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('BEGIN');
          const r = await fn(wrap(c));
          await c.query('COMMIT');
          return r;
        } catch (e) {
          await c.query('ROLLBACK');
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    });
    const db = wrap(pool);
    await db.query(await readFile(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8'));
    return db;
  }
  const p = new PGlite(path);
  await p.exec(await readFile(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8'));
  const wrap = (q: any): DB => ({
    query: (s, params) => q.query(s, params),
    transaction: (fn) => q.transaction((tx: any) => fn(wrap(tx))),
    close: () => p.close(),
  });
  return wrap(p);
}
