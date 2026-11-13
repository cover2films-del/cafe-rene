import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
import { createApp } from '../src/app.ts';
import { deliverPush, enqueuePush } from '../src/push.ts';
import { drinkLibrary, mixologist } from '../../../packages/shared/src/drinks.ts';
import { access } from 'node:fs/promises';
test('bar catalogue, mixologist and printed check-ins preserve stock, role and purchase boundaries', async () => {
  const db = await openDB('memory://');
  await seed(db);
  const s = new Service(db, { secret: 'test', webhookSecret: 'test' });
  const server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const origin = 'http://127.0.0.1:' + (server.address() as any).port;
  const call = async (path: string, token?: string, body?: any, method = 'GET', status = 200) => {
    const r = await fetch(origin + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    assert.equal(r.status, status, JSON.stringify(d));
    return d;
  };
  try {
    const daniel = (await s.login('daniel@demo.rene', 'ReneDemo2026!')).token;
    const manager = (await s.login('manager@demo.rene', 'ReneDemo2026!')).token;
    const bar = await call('/drinks');
    assert.ok(bar.drinks.length >= 29);
    assert.ok(
      bar.drinks.every((d: any) => d.price === null && !d.orderable && d.history.length >= 2),
    );
    for (const d of drinkLibrary)
      await access(
        new URL('../../web/public/images/drinks/' + d.imageKey + '.webp', import.meta.url),
      );
    assert.ok(mixologist(drinkLibrary, 'Citrus', 'None').every((d) => !d.alcohol));
    assert.equal(mixologist(drinkLibrary, 'Coffee', 'Gin').length, 0);
    const data = {
      name: 'Guest brew',
      description: 'A guest IPA confirmed by the team.',
      category: 'Craft & specials',
      styleId: 'ipa',
      availability: 'available',
      price: 625,
      sourceUrl: 'https://www.caferene.co.uk/restaurant',
    };
    await call('/manager/drinks/bar-guest', daniel, data, 'PUT', 403);
    const updated = await call('/manager/drinks/bar-guest', manager, data, 'PUT');
    assert.equal(updated.drinks.find((d: any) => d.id === 'bar-guest').price, 625);
    assert.equal(updated.drinks.find((d: any) => d.id === 'bar-guest').orderable, false);
    const before = await s.rewards((await s.login('daniel@demo.rene', 'ReneDemo2026!')).user);
    await call('/visits/check-in', undefined, { code: 'rene-gloucester-v1' }, 'POST', 403);
    const record = await call('/visits/check-in', daniel, { code: 'rene-gloucester-v1' }, 'POST');
    assert.equal(record.checkedInToday, true);
    assert.equal(record.alreadyRecorded, false);
    assert.equal(
      (await call('/visits/check-in', daniel, { code: 'rene-gloucester-v1' }, 'POST'))
        .alreadyRecorded,
      true,
    );
    const after = await s.rewards((await s.login('daniel@demo.rene', 'ReneDemo2026!')).user);
    assert.equal(after.points, before.points);
    assert.equal(after.stampCard.stamps, before.stampCard.stamps);
    assert.equal(after.visits, before.visits);
    await call('/manager/print-checkin/revoke', daniel, {}, 'POST', 403);
    const rotated = await call('/manager/print-checkin/revoke', manager, {}, 'POST');
    assert.equal(rotated.code, 'rene-gloucester-v2');
    await call('/visits/check-in', daniel, { code: 'rene-gloucester-v1' }, 'POST', 410);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  }
});
test('phone push honours category consent, member access, duplicate keys, receipts and logout', async () => {
  const db = await openDB('memory://');
  await seed(db);
  const s = new Service(db, { secret: 'test', webhookSecret: 'test' });
  const server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const origin = 'http://127.0.0.1:' + (server.address() as any).port;
  const call = async (path: string, token: string, body?: any, method = 'POST') => {
    const r = await fetch(origin + '/api' + path, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    assert.equal(r.status, 200, JSON.stringify(d));
    return d;
  };
  try {
    const daniel = (await s.login('daniel@demo.rene', 'ReneDemo2026!')).token,
      alex = (await s.login('demo-alex@demo.rene', 'ReneDemo2026!')).token;
    const prefs = { messages: true, deals: false, rewards: true, gigs: true, events: true };
    const token = 'ExponentPushToken[alex-device-1]';
    await call('/notifications/device', alex, { token, platform: 'ios', preferences: prefs });
    const msg = {
      body: 'Private message must never appear on a lock screen',
      clientId: randomUUID(),
    };
    await call('/circles/demo-friday-circle/messages', daniel, msg);
    await call('/circles/demo-friday-circle/messages', daniel, msg);
    const rows = (await db.query('SELECT * FROM push_deliveries')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, 'demo-alex');
    assert.ok(!rows[0].body.includes('Private message'));
    await enqueuePush(db, 'offer-test', 'deals', 'Deal', 'A deal', { screen: 'Rewards' });
    assert.equal((await db.query('SELECT id FROM push_deliveries')).rows.length, 1);
    await call('/notifications/device', alex, {
      token,
      platform: 'ios',
      preferences: { ...prefs, messages: false },
    });
    let requests = 0;
    const provider = (async (url: any, opts: any) => {
      requests++;
      if (String(url).endsWith('/send')) {
        const payload = JSON.parse(opts.body);
        assert.equal(payload.length, 1);
        assert.equal(payload[0].to, token);
        return new Response(JSON.stringify({ data: [{ status: 'ok', id: 'receipt-1' }] }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ data: { 'receipt-1': { status: 'ok' } } }), {
        status: 200,
      });
    }) as typeof fetch;
    await deliverPush(db, provider);
    assert.equal(requests, 0);
    await call('/notifications/device', alex, { token, platform: 'ios', preferences: prefs });
    await deliverPush(db, provider);
    assert.equal(requests, 1);
    await db.query("UPDATE push_deliveries SET next_at=0 WHERE status='receipt_pending'");
    await deliverPush(db, provider);
    assert.equal((await db.query('SELECT status FROM push_deliveries')).rows[0].status, 'sent');
    const status = await call('/notifications/status', alex, undefined, 'GET');
    assert.ok(!JSON.stringify(status).includes(token));
    await call('/auth/logout', alex, { pushToken: token });
    assert.equal((await db.query('SELECT active FROM push_devices')).rows[0].active, false);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  }
});
