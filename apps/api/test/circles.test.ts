import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
import { createApp } from '../src/app.ts';
test('Daniel demo points/stamps and private circles enforce membership, invitations and message idempotency', async () => {
  const db = await openDB('memory://');
  await seed(db);
  const s = new Service(db, { secret: 'test', webhookSecret: 'test' });
  const server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const origin = 'http://127.0.0.1:' + (server.address() as any).port;
  async function call(path: string, method = 'GET', body?: any, token?: string, status = 200) {
    const r = await fetch(origin + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    assert.equal(r.status, status, JSON.stringify(data));
    return data;
  }
  try {
    const daniel = (await s.login('daniel@demo.rene', 'ReneDemo2026!')).token,
      alex = (await s.login('demo-alex@demo.rene', 'ReneDemo2026!')).token,
      customer = (await s.login('customer@demo.rene', 'ReneDemo2026!')).token,
      staff = (await s.login('staff@demo.rene', 'ReneDemo2026!')).token;
    const rewards = await call('/rewards', 'GET', undefined, daniel);
    assert.ok(rewards.points >= 100);
    assert.equal(rewards.stampCard.stamps, 3);
    assert.equal(rewards.offers.find((o: any) => o.id === 'kitchen-six').eligible, false);
    await assert.rejects(() =>
      s.checkout(
        {
          items: [{ itemId: 'cod', quantity: 1, modifierIds: [] }],
          collection: true,
          offerId: 'kitchen-six',
          requestKey: randomUUID(),
        },
        { id: 'daniel', role: 'customer' },
      ),
    );
    const history = await call('/history', 'GET', undefined, daniel);
    assert.equal(history.orders.length, 3);
    assert.ok(history.orders.some((o: any) => o.items.some((i: any) => i.item_id === 'peroni')));
    await call('/circles/demo-friday-circle', 'GET', undefined, customer, 403);
    await call('/circles/demo-friday-circle', 'GET', undefined, staff, 403);
    const directory = await call('/circles/directory?q=Alex', 'GET', undefined, daniel);
    assert.ok(directory.some((p: any) => p.id === 'demo-alex'));
    assert.ok(directory.every((p: any) => !('email' in p) && !('points' in p)));
    const direct = await call('/circles/direct', 'POST', { userId: 'demo-alex' }, daniel);
    await call('/circles/' + direct.id, 'GET', undefined, alex, 403);
    await call('/circles/' + direct.id + '/respond', 'POST', { accept: true }, alex);
    const message = { body: 'Demo private plan', clientId: randomUUID() };
    await call('/circles/' + direct.id + '/messages', 'POST', message, daniel);
    await call('/circles/' + direct.id + '/messages', 'POST', message, daniel);
    const conversation = await call('/circles/' + direct.id, 'GET', undefined, alex);
    assert.equal(conversation.messages.length, 1);
    await call(
      '/circles/' + direct.id + '/messages',
      'POST',
      { body: 'unauthorised', clientId: randomUUID() },
      customer,
      403,
    );
    const plan = await call(
      '/circles/' + direct.id + '/plans',
      'POST',
      {
        title: 'Demo evening',
        date: new Date(Date.now() + 864e5).toISOString(),
        notes: 'No booking made',
      },
      daniel,
    );
    await call(
      '/circles/' + direct.id + '/plans/' + plan.id + '/rsvp',
      'PUT',
      { response: 'yes' },
      alex,
    );
    await call(
      '/circles/' + direct.id + '/plans/' + plan.id + '/rsvp',
      'PUT',
      { response: 'yes' },
      customer,
      403,
    );
    assert.equal(
      (await call('/circles/' + direct.id, 'GET', undefined, daniel)).plans[0].rsvps.length,
      1,
    );
    await call('/circles/demo-friday-circle/invite', 'POST', { userId: 'customer' }, alex, 403);
    await call('/privacy/account', 'DELETE', { confirm: 'DELETE' }, daniel);
    await seed(db);
    assert.equal((await db.query("SELECT * FROM loyalty WHERE user_id='daniel'")).rows.length, 0);
    await assert.rejects(() => s.login('daniel@demo.rene', 'ReneDemo2026!'));
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  }
});
