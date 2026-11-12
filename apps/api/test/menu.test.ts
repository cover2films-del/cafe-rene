import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import {
  publishedMenu,
  menuSources,
  seasonalMenu,
} from '../../../packages/shared/src/venue-menu.ts';
import { foodPhotography } from '../../../packages/shared/src/content.ts';
import { openDB } from '../src/db.ts';
import { seed } from '../src/seed.ts';

test('published menus preserve source prices, service distinctions, illustrations and manager edits', async () => {
  assert.equal(menuSources.length, 6);
  assert.equal(publishedMenu.length, 96);
  assert.equal(new Set(publishedMenu.map((m) => m.id)).size, 96);
  assert.equal(publishedMenu.find((m) => m.id === 'sirloin')?.price, 2295);
  assert.equal(publishedMenu.find((m) => m.id === 'sunday-sirloin')?.price, 2195);
  assert.equal(publishedMenu.find((m) => m.id === 'sunday-gammon')?.price, 1495);
  assert.equal(publishedMenu.find((m) => m.id === 'rene-breakfast')?.price, 1095);
  assert.equal(
    publishedMenu.find((m) => m.id === 'burger')?.modifiers.find((m) => m.id === 'cheese')?.price,
    200,
  );
  assert.equal(seasonalMenu('festive').length, 12);
  assert.equal(seasonalMenu('christmas-children').length, 11);
  for (const item of [
    ...publishedMenu,
    ...seasonalMenu('festive'),
    ...seasonalMenu('christmas-children'),
  ]) {
    assert.ok(foodPhotography[item.imageKey], 'Missing illustration for ' + item.name);
    await access(
      new URL('../../web/public' + foodPhotography[item.imageKey].path, import.meta.url),
    );
    await access(
      new URL(
        '../../../packages/assets/food/generated/' + item.imageKey + '.webp',
        import.meta.url,
      ),
    );
  }
  const db = await openDB('memory://');
  try {
    await seed(db);
    await db.query("UPDATE menu SET data=jsonb_set(data,'{price}','1200') WHERE id='burger'");
    await seed(db);
    assert.equal(
      (await db.query("SELECT data FROM menu WHERE id='burger'")).rows[0].data.price,
      1200,
    );
    const bar = (await db.query("SELECT data FROM menu WHERE id='ale'")).rows[0].data;
    assert.equal(bar.available, false);
    assert.equal(bar.menuEdition, 'bar');
    await db.query("UPDATE menu SET data=jsonb_set(data,'{available}','true') WHERE id='ale'");
    await seed(db);
    assert.equal(
      (await db.query("SELECT data FROM menu WHERE id='ale'")).rows[0].data.available,
      true,
    );

    assert.equal(
      (await db.query("SELECT title FROM circles WHERE id='demo-friday-circle'")).rows[0].title,
      'Friday at René',
    );
  } finally {
    await db.close();
  }
});
