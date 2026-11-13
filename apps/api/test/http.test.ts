import sharp from 'sharp';
import { LocalMedia } from '../src/media.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';
import { Service } from '../src/service.ts';
import { createApp } from '../src/app.ts';
test('HTTP demonstration: guest ordering, account claim, staff fulfilment, rewards, manager refund and privacy', async () => {
  const db = await openDB('memory://');
  await seed(db);
  const s = new Service(db, { secret: 'http', webhookSecret: 'webhook' });
  const server = createApp(s).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const origin = 'http://127.0.0.1:' + (server.address() as any).port;
  async function call(path: string, method = 'GET', body?: any, token?: string, guest?: string) {
    const r = await fetch(origin + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Native-Client': 'true',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(guest ? { 'X-Guest-Secret': guest } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await r.json();
    assert.equal(r.ok, true, JSON.stringify(data));
    return data;
  }
  let uploadedId: string | null = null;
  try {
    const boot = await call('/bootstrap');
    assert.equal(boot.mode, 'demo');
    assert.ok(boot.menu.length >= 8);
    assert.ok(boot.events.every((e: any) => !e.sample && new Date(e.date) > new Date()));
    const badSession = await call('/bootstrap', 'GET', undefined, 'expired-token');
    assert.equal(badSession.mode, 'demo');
    const table = await call('/demo/table/2');
    const r = await call('/orders', 'POST', {
      items: [{ itemId: 'burger', quantity: 1, modifierIds: ['cheese'] }],
      collection: false,
      tableRef: table.ref,
      notes: 'HTTP smoke test',
      requestKey: randomUUID(),
    });
    assert.equal(r.order.total, 1695);
    await call('/orders/' + r.order.id + '/mock-pay', 'POST', {}, undefined, r.guestSecret);
    const customer = await call('/auth/login', 'POST', {
      email: 'customer@demo.rene',
      password: 'ReneDemo2026!',
    });
    await call('/orders/' + r.order.id + '/claim', 'POST', {}, customer.token, r.guestSecret);
    const staff = await call('/auth/login', 'POST', {
      email: 'staff@demo.rene',
      password: 'ReneDemo2026!',
    });
    await call('/staff/jobs/run', 'POST', {}, staff.token);
    const queue = await call('/staff/queue', 'GET', undefined, staff.token);
    assert.equal(queue.orders.length, 1);
    for (const status of ['accepted', 'preparing', 'ready', 'completed'])
      await call('/staff/orders/' + r.order.id + '/progress', 'POST', { status }, staff.token);
    const rewards = await call('/rewards', 'GET', undefined, customer.token);
    assert.ok(rewards.points > 16);
    assert.equal(rewards.challenges.find((c: any) => c.id === 'first').progress, 1);
    const manager = await call('/auth/login', 'POST', {
      email: 'manager@demo.rene',
      password: 'ReneDemo2026!',
    });
    const catalogue = await call('/manager/catalogue', 'GET', undefined, manager.token);
    assert.equal(catalogue.challenges.length, 7);
    await call('/staff/orders/' + r.order.id + '/refund', 'POST', {}, manager.token);
    const refundedRewards = await call('/rewards', 'GET', undefined, customer.token);
    assert.equal(refundedRewards.points, 0);
    assert.equal(refundedRewards.challenges.find((c: any) => c.id === 'first').progress, 0);
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    const uploaded = await call(
      '/manager/media',
      'POST',
      {
        title: 'Test authorised image',
        sourceUrl: '',
        permission: 'authorised',
        base64: image.toString('base64'),
      },
      manager.token,
    );
    uploadedId = uploaded.id;
    const imageResponse = await fetch(origin + uploaded.previewUrl, {
      headers: { Authorization: 'Bearer ' + manager.token },
    });
    assert.equal(imageResponse.status, 200);
    const imageMeta = await sharp(Buffer.from(await imageResponse.arrayBuffer())).metadata();
    assert.equal(imageMeta.format, 'webp');
    assert.equal(imageMeta.width, 32);
    assert.equal((await fetch(origin + uploaded.previewUrl)).status, 403);
    assert.equal((await fetch(origin + '/api/media/' + uploaded.id)).status, 404);
    await call(
      '/manager/content/' + uploaded.id + '/review',
      'POST',
      { status: 'approved' },
      manager.token,
    );
    assert.equal((await fetch(origin + '/api/media/' + uploaded.id)).status, 200);
    await call(
      '/manager/content/' + uploaded.id + '/review',
      'POST',
      { status: 'needs_review' },
      manager.token,
    );
    assert.equal((await fetch(origin + '/api/media/' + uploaded.id)).status, 404);
    const content = await call('/manager/content', 'GET', undefined, manager.token);
    assert.ok(content.length >= 10);
    const exported = await call('/privacy/export', 'GET', undefined, customer.token);
    assert.equal(exported.orders.length, 1);
    await call('/privacy/account', 'DELETE', { confirm: 'DELETE' }, customer.token);
    await call('/auth/logout', 'POST', {}, customer.token);
    assert.equal((await call('/bootstrap', 'GET', undefined, customer.token)).mode, 'demo');
  } finally {
    if (uploadedId) await new LocalMedia().remove(uploadedId + '.webp');
    await new Promise<void>((r) => server.close(() => r()));
    await db.close();
  }
});
