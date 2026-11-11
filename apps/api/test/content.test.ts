import { test } from 'node:test';
import assert from 'node:assert/strict';
import { officialProgramme, visibleEvents } from '../../../packages/shared/src/content.ts';
import { openDB } from '../src/db.ts';
import { refreshSocial, socialStatus } from '../src/social.ts';
test('official programme has source-backed London dates; past events and sample cards stay out', () => {
  const upcoming = visibleEvents(
    [...officialProgramme, { id: 'sample', sample: true, date: '2026-11-15T21:00:00Z' }],
    Date.parse('2026-11-12T10:00:00Z'),
  );
  assert.equal(upcoming[0].title, 'Baron Crâne');
  assert.equal(upcoming[0].date, '2026-11-13T21:00:00Z');
  assert.ok(upcoming.every((e) => !e.sample && e.sourceUrl));
  assert.equal(upcoming.length, 5);
  assert.deepEqual(visibleEvents(officialProgramme, Date.parse('2026-12-01T00:00:00Z')), []);
});
test('authorised social refresh imports once into review, never fetches images or publishes events', async () => {
  const keys = [
    'META_GRAPH_VERSION',
    'META_PAGE_ID',
    'META_PAGE_ACCESS_TOKEN',
    'META_INSTAGRAM_ACCOUNT_ID',
    'META_INSTAGRAM_ACCESS_TOKEN',
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const db = await openDB('memory://');
  try {
    for (const k of keys) delete process.env[k];
    assert.equal(socialStatus().facebook, false);
    await assert.rejects(() => refreshSocial(db, 'manager'));
    process.env.META_GRAPH_VERSION = 'v99.0';
    process.env.META_PAGE_ID = '123';
    process.env.META_PAGE_ACCESS_TOKEN = 'test-secret';
    let calls = 0;
    const provider = (async (url: any, options: any) => {
      calls++;
      assert.equal(new URL(url).hostname, 'graph.facebook.com');
      assert.equal(new URL(url).searchParams.get('access_token'), null);
      assert.equal(options.headers.Authorization, 'Bearer test-secret');
      return new Response(
        JSON.stringify({
          data: [
            {
              id: '123_456',
              message: 'Demo venue post. Event date needs a manager review.',
              created_time: '2026-11-10T10:00:00Z',
              permalink_url: 'https://www.facebook.com/thecaferene/posts/123_456',
              full_picture: 'https://example.invalid/private-image.jpg',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }) as typeof fetch;
    assert.equal((await refreshSocial(db, 'manager', provider)).imported, 1);
    assert.equal((await refreshSocial(db, 'manager', provider)).imported, 0);
    assert.equal(calls, 2);
    const rows = (await db.query('SELECT * FROM content')).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'needs_review');
    assert.equal(rows[0].data.publicationDate, '2026-11-10T10:00:00Z');
    assert.equal(rows[0].data.date, undefined);
    assert.equal((await db.query('SELECT * FROM events')).rows.length, 0);
    assert.equal(JSON.stringify(rows).includes('test-secret'), false);
  } finally {
    for (const k of keys) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k];
    }
    await db.close();
  }
});
