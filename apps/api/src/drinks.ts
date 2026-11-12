import { drinkLibrary } from '../../../packages/shared/src/drinks.ts';
import { publicVenueContent } from './venue-content.ts';
import type { DB } from './db.ts';
export async function drinkCatalogue(db: DB) {
  const saved =
    (await db.query("SELECT data FROM settings WHERE id='bar-catalogue'")).rows[0]?.data || [];
  const drinks = [
    ...drinkLibrary.map((item) => ({
      ...item,
      ...(saved.find((d: any) => d.id === item.id) || {}),
      orderable: false,
    })),
    ...saved
      .filter((d: any) => !drinkLibrary.some((item) => item.id === d.id))
      .map((d: any) => ({ ...d, orderable: false })),
  ];
  const content = await publicVenueContent(db);
  return {
    drinks,
    updates: content.posts.filter((p: any) =>
      /\b(beer|ale|ipa|stout|lager|cocktail|tap|craft|shooters?|bar special)\b/i.test(p.text),
    ),
    menus: content.menus || [],
    checkedAt: content.checkedAt,
    notice:
      'Explore drink styles and recipes. Current taps, brands, prices and ingredients are confirmed by the bar team. Illustrations show serving ideas.',
  };
}
