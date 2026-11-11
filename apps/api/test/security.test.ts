import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDB, type DB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
import { createApp } from '../src/app.ts';
import { sign } from '../src/adapters.ts';
let db: DB, s: Service, server: any, origin: string;
const customer = { id: 'customer', role: 'customer' },
  staff = { id: 'staff', role: 'staff' },
  manager = { id: 'manager', role: 'manager' };
const basket = () => ({
  items: [{ itemId: 'burger', quantity: 1, modifierIds: [] }],
  collection: true,
  requestKey: randomUUID(),
});
before(async () => {
  db = await openDB('memory://');
  await seed(db);
  s = new Service(db, { secret: 'test-secret', webhookSecret: 'test-webhook' });
  server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  origin = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
  await new Promise<void>((r) => server.close(r));
  await db.close();
});
async function completed() {
  const r = await s.checkout(basket(), customer);
  await s.mockPay(r.order.id, customer);
  await s.runJobs(true);
  for (const state of ['accepted', 'preparing', 'ready', 'completed'])
    await s.progress(r.order.id, state, staff);
  return r.order.id;
}
test('client price, discount and invalid modifiers are rejected', async () => {
  await assert.rejects(() => s.checkout({ ...basket(), price: 1, discount: 1494 }, customer));
  await assert.rejects(() =>
    s.checkout(
      { ...basket(), items: [{ itemId: 'burger', quantity: 1, modifierIds: ['not-real'] }] },
      customer,
    ),
  );
  const r = await s.checkout(basket(), customer);
  assert.equal(r.order.total, 1495);
});
test('signed table references cannot be tampered with, expired or revoked', async () => {
  const ref = s.reference('table', 'table-1');
  assert.equal((await s.table(ref)).id, 'table-1');
  await assert.rejects(() => s.table(ref + 'x'));
  await assert.rejects(() => s.table(s.reference('table', 'table-1', 1, -1)));
  await db.query('UPDATE tables SET version=version+1 WHERE id=$1', ['table-1']);
  await assert.rejects(() => s.table(ref));
});
test('payment signature and exact amount are required; duplicate events are idempotent', async () => {
  const r = await s.checkout(basket(), customer);
  const e = { id: 'evt-1', orderId: r.order.id, amount: 1495, type: 'payment.succeeded' };
  const raw = Buffer.from(JSON.stringify(e));
  await assert.rejects(() => s.webhook(raw, 'bad'));
  const wrong = Buffer.from(JSON.stringify({ ...e, amount: 1 }));
  await assert.rejects(() => s.webhook(wrong, sign(wrong.toString(), 'test-webhook')));
  await s.webhook(raw, sign(raw.toString(), 'test-webhook'));
  await s.webhook(raw, sign(raw.toString(), 'test-webhook'));
  assert.equal(
    (await db.query('SELECT * FROM jobs WHERE order_id=$1', [r.order.id])).rows.length,
    1,
  );
  assert.equal((await s.order(r.order.id, customer)).status, 'awaiting_acceptance');
  assert.equal(
    (await db.query('SELECT * FROM loyalty WHERE order_id=$1', [r.order.id])).rows.length,
    0,
  );
});
test('failed POS delivery enters recovery queue and retry is idempotent', async () => {
  await s.runJobs(true);
  const r = await s.checkout(basket(), customer);
  s.pos.failNext = true;
  await s.mockPay(r.order.id, customer);
  await s.runJobs(true);
  const job = (await db.query('SELECT * FROM jobs WHERE order_id=$1', [r.order.id])).rows[0];
  assert.equal(job.status, 'failed');
  await assert.rejects(() => s.progress(r.order.id, 'accepted', staff));
  await s.runJobs(true);
  await s.runJobs(true);
  assert.equal((await s.order(r.order.id, customer)).pos_ref, 'MOCK-' + r.order.id);
  assert.equal(
    (await db.query('SELECT * FROM jobs WHERE order_id=$1', [r.order.id])).rows.length,
    1,
  );
});
test('completion earns eligible rewards once; refund reverses rewards and cancels', async () => {
  const id = await completed();
  const before = await s.points(customer.id);
  const earned = (
    await db.query("SELECT * FROM loyalty WHERE order_id=$1 AND reason='purchase'", [id])
  ).rows;
  assert.equal(earned.length, 1);
  assert.equal(earned[0].points, 14);
  await assert.rejects(() => s.progress(id, 'completed', staff));
  await s.refund(id, manager);
  assert.equal(await s.points(customer.id), before - 14);
  assert.equal((await s.order(id, customer)).payment, 'refunded');
  await assert.rejects(() => s.refund(id, manager));
});
test('duplicate and expired venue check-ins cannot farm rewards', async () => {
  await db.query('DELETE FROM visits WHERE user_id=$1', [customer.id]);
  const ref = s.reference('visit', 'venue', 1, 120);
  await s.checkin(customer, ref);
  await assert.rejects(() => s.checkin(customer, ref));
  await assert.rejects(() => s.checkin(customer, s.reference('visit', 'venue', 1, -1)));
  assert.equal(
    (await db.query('SELECT * FROM visits WHERE user_id=$1', [customer.id])).rows.length,
    1,
  );
});
test('staff cannot refund or access manager HTTP endpoints', async () => {
  const r = await s.checkout(basket(), customer);
  await s.mockPay(r.order.id, customer);
  await assert.rejects(() => s.refund(r.order.id, staff));
  const login = await s.login('staff@demo.rene', 'ReneDemo2026!');
  const response = await fetch(origin + '/api/manager/overview', {
    headers: { Authorization: 'Bearer ' + login.token },
  });
  assert.equal(response.status, 403);
});
test('guest receipt ownership is required and customer cannot read another guest receipt', async () => {
  const r = await s.checkout(basket(), null);
  await assert.rejects(() => s.order(r.order.id, customer));
  await assert.rejects(() => s.order(r.order.id, null, 'wrong'));
  assert.equal((await s.order(r.order.id, null, r.guestSecret!)).id, r.order.id);
});
test('expired and redeemed offers cannot be reused', async () => {
  const r = await s.checkout({ ...basket(), offerId: 'welcome' }, customer);
  assert.equal(r.order.total, 1295);
  await s.mockPay(r.order.id, customer);
  await assert.rejects(() => s.checkout({ ...basket(), offerId: 'welcome' }, customer));
  await db.query('INSERT INTO offers VALUES($1,$2)', [
    'expired',
    { id: 'expired', expires: '2020-01-01', discount: 100, min: 100, points: 0 },
  ]);
  await assert.rejects(() => s.checkout({ ...basket(), offerId: 'expired' }, customer));
});
test('marketing opt-outs and interest/channel preferences are respected', async () => {
  assert.deepEqual(await s.campaignAudience({ interest: 'Blues', channel: 'email' }), []);
  await db.query('UPDATE users SET preferences=$1 WHERE id=$2', [
    { personalisation: true, email: true, push: false, interests: ['Blues'] },
    customer.id,
  ]);
  assert.deepEqual(await s.campaignAudience({ interest: 'Blues', channel: 'email' }), [
    customer.id,
  ]);
  assert.deepEqual(await s.campaignAudience({ interest: 'DJ', channel: 'email' }), []);
  assert.deepEqual(await s.campaignAudience({ interest: 'Blues', channel: 'push' }), []);
  await db.query('UPDATE users SET preferences=$1 WHERE id=$2', [
    { personalisation: false, email: true, interests: ['Blues'] },
    customer.id,
  ]);
  assert.deepEqual(await s.campaignAudience({ interest: 'Blues', channel: 'email' }), []);
});
test('alcohol requires staff age verification and does not earn alcohol points', async () => {
  const r = await s.checkout(
    { ...basket(), items: [{ itemId: 'ale', quantity: 1, modifierIds: [] }] },
    customer,
  );
  await s.mockPay(r.order.id, customer);
  await s.runJobs(true);
  await assert.rejects(() => s.progress(r.order.id, 'accepted', staff));
  await s.progress(r.order.id, 'accepted', staff, true);
  for (const state of ['preparing', 'ready', 'completed'])
    await s.progress(r.order.id, state, staff);
  assert.equal(
    (
      await db.query("SELECT points FROM loyalty WHERE order_id=$1 AND reason='purchase'", [
        r.order.id,
      ])
    ).rows[0].points,
    0,
  );
});
test('live mode fails closed', () =>
  assert.throws(() => new Service(db, { secret: 'a', webhookSecret: 'b', mode: 'live' })));
