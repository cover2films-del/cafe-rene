import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { openDB } from '../src/db.ts';
import { discoverVenueImages, publicVenueContent } from '../src/venue-content.ts';
import { refreshContent } from '../src/content-refresh.ts';
test('official asset refresh is bounded to the venue, leased, persistent and keeps last-good content', async () => {
  const html =
    '<img src="http://127.0.0.1/private.png"><img src="https://evil.test/uploads/logo.png"><img src="/uploads/demo/logo.png" alt="cafe rene logo"><noscript><img src="/uploads/demo/LiveMusic26-11-Nov.webp"></noscript>';
  assert.equal(discoverVenueImages(html).length, 2);
  const db = await openDB('memory://');
  const image = await sharp({
    create: { width: 80, height: 100, channels: 3, background: '#087c60' },
  })
    .png()
    .toBuffer();
  let calls = 0;
  const provider = (async (url: any) => {
    calls++;
    const u = new URL(url);
    assert.equal(u.origin, 'https://www.caferene.co.uk');
    return new Response(
      u.pathname.includes('events328') || u.pathname === '/restaurant' ? html : image,
      { status: 200 },
    );
  }) as typeof fetch;
  try {
    const results = await Promise.all([
      refreshContent(db, false, provider),
      refreshContent(db, false, provider),
    ]);
    assert.equal(results.filter((r) => r.skipped).length, 1);
    assert.equal(calls, 4);
    assert.equal((await db.query('SELECT id FROM venue_assets')).rows.length, 2);
    const before = await publicVenueContent(db);
    assert.equal(before.programmes.length, 1);
    assert.ok(before.logo.id);
    assert.equal((await refreshContent(db, false, provider)).skipped, true);
    await refreshContent(db, true, (async () => {
      throw Error('provider offline');
    }) as typeof fetch);
    const after = await publicVenueContent(db);
    assert.equal(after.programmes[0].url, before.programmes[0].url);
    assert.equal(after.checkedAt, before.checkedAt);
  } finally {
    await db.close();
  }
});
