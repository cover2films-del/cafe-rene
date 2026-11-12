import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
const require = createRequire(import.meta.url);
const { prepareValue } = require('pg/lib/utils');

test('PostgreSQL driver wire values support JSON arrays, modifier snapshots and seed recovery', async () => {
  const embedded = await openDB('memory://');
  // Exercise the real PostgreSQL adapter and pg's wire-value conversion against
  // an embedded PostgreSQL engine; no Neon credentials or network required.
  const query = async (sql: string, params?: any[]) => {
    if (sql.startsWith('CREATE TABLE')) return { rows: [] };
    return embedded.query(
      sql,
      params?.map((value) =>
        typeof value === 'boolean' || typeof value === 'number' ? value : prepareValue(value),
      ),
    );
  };
  const mocks = [
    mock.method(pg.Pool.prototype, 'query', query),
    mock.method(pg.Pool.prototype, 'connect', async () => ({ query, release() {} })),
    mock.method(pg.Pool.prototype, 'end', async () => {}),
  ];
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgresql://test.invalid/test';
  try {
    const db = await openDB();
    await seed(db);
    const definitions = (await db.query("SELECT data FROM settings WHERE id='challenges'")).rows[0]
      .data;
    assert.equal(definitions.length, 7);
    const service = new Service(db, { secret: 'test', webhookSecret: 'test' });
    const result = await service.checkout(
      {
        collection: true,
        requestKey: randomUUID(),
        items: [{ itemId: 'burger', quantity: 1, modifierIds: ['cheese'] }],
      },
      { id: 'customer', role: 'customer' },
    );
    const order = await service.order(result.order.id, { id: 'customer', role: 'customer' });
    assert.equal(order.items[0].modifiers[0].id, 'cheese');
    assert.equal(order.total, 1695);
    // Recover a partial older seed without overwriting manager edits.
    await db.query("DELETE FROM settings WHERE id='challenges'");
    await db.query("DELETE FROM content WHERE id='source-0'");
    await db.query("UPDATE menu SET data=jsonb_set(data,'{price}','1234') WHERE id='burger'");
    await seed(db);
    assert.equal((await service.menu()).find((m) => m.id === 'burger')?.price, 1234);
    assert.equal(
      (await db.query("SELECT data FROM settings WHERE id='challenges'")).rows[0].data.length,
      7,
    );
    assert.equal((await db.query("SELECT id FROM content WHERE id='source-0'")).rows.length, 1);
    assert.equal((await db.query('SELECT id FROM users')).rows.length, 7);
    await db.close();
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    for (const handle of mocks) handle.mock.restore();
    await embedded.close();
  }
});
