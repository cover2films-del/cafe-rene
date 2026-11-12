import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
import { createApp } from '../src/app.ts';
import { memberDiscovery } from '../src/discovery.ts';

test('member picks enforce opt-in, own-history privacy, taste filters and non-orderable bar prices', async () => {
  const db = await openDB('memory://');
  await seed(db);
  const s = new Service(db, { secret: 'discovery', webhookSecret: 'test' });
  const server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const origin = 'http://127.0.0.1:' + (server.address() as any).port;
  const call = async (path: string, token?: string, body?: any, status = 200) => {
    const r = await fetch(origin + '/api' + path, {
      method: body ? 'PUT' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    assert.equal(r.status, status, JSON.stringify(data));
    return data;
  };
  try {
    await call('/my-rene/discovery', undefined, undefined, 403);
    const daniel = (await s.login('daniel@demo.rene', 'ReneDemo2026!')).token;
    const customer = (await s.login('customer@demo.rene', 'ReneDemo2026!')).token;
    const originalOrders = Number((await db.query('SELECT count(*) AS n FROM orders')).rows[0].n);
    const opening = await call('/my-rene/discovery', daniel);
    assert.equal(opening.personalised, true);
    assert.equal(opening.suggestions.length, 4);
    assert.equal(opening.popular.length, 4);
    assert.ok(opening.suggestions.some((item: any) => item.reason === 'Matches your saved tastes'));
    assert.equal(opening.drinks.length, 2);
    assert.ok(opening.drinks.every((item: any) => item.price === null && item.orderable === false));
    assert.ok(!/demo/i.test(JSON.stringify(opening)));
    const prefs = {
      personalisation: true,
      email: false,
      push: false,
      location: false,
      interests: [],
      tastes: ['Sweet treats'],
    };
    await call('/preferences', customer, prefs);
    const desserts = await call('/my-rene/discovery?userId=daniel', customer);
    assert.ok(desserts.suggestions.every((item: any) => item.category === 'Desserts'));
    assert.ok(!JSON.stringify(desserts).includes('daniel'));
    await call('/preferences', customer, { ...prefs, tastes: ['Plant-based', 'Alcohol-free'] });
    const plants = await call('/my-rene/discovery', customer);
    assert.ok(plants.suggestions.length > 0);
    const menu = await s.menu();
    assert.ok(
      plants.suggestions.every((item: any) =>
        menu.find((m) => m.id === item.id)!.dietary.some((label) => /^Vegan\b/.test(label)),
      ),
    );
    assert.ok(plants.drinks.every((item: any) => !item.alcohol));
    // Older app clients omit tastes: keep the saved values during another preference edit.
    const { tastes: _omitted, ...oldClient } = prefs;
    const saved = await call('/preferences', customer, oldClient);
    assert.deepEqual(saved.preferences.tastes, ['Plant-based', 'Alcohol-free']);
    await call('/preferences', customer, { ...prefs, tastes: ['unsupported'] }, 400);
    await call('/preferences', daniel, { ...prefs, personalisation: false });
    let historyReads = 0;
    const wrapped = {
      ...db,
      query: async (sql: string, params?: any[]) => {
        if (/FROM order_items/.test(sql)) historyReads++;
        return db.query(sql, params);
      },
    };
    const generic = await memberDiscovery(wrapped, 'daniel');
    assert.equal(generic.personalised, false);
    assert.equal(historyReads, 0);
    assert.ok(generic.suggestions.every((item) => item.reason === 'A pick from the René kitchen'));
    await db.query("UPDATE menu SET data=jsonb_set(data,'{available}','false') WHERE id='burger'");
    const availability = await call('/my-rene/discovery', daniel);
    assert.ok(
      ![...availability.popular, ...availability.suggestions].some((item) => item.id === 'burger'),
    );
    await seed(db);
    assert.equal((await memberDiscovery(db, 'daniel')).personalised, false);
    assert.equal(
      Number((await db.query('SELECT count(*) AS n FROM orders')).rows[0].n),
      originalOrders,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.close();
  }
});
