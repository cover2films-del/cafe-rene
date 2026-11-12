import type { DB } from './db.ts';
import type { MenuItem } from '../../../packages/shared/src/index';
export { foodTastes } from '../../../packages/shared/src/tastes';
const defaults = ['burger', 'cod', 'chilli', 'club', 'brownie', 'veggie', 'earth-bowl', 'curry'];
export async function seedDiscovery(db: DB) {
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'discovery-picks-v1',
    {
      food: defaults,
      drinks: ['ale', 'soft'],
      provenance: 'seeded-curation',
      verifiedSales: false,
    },
  ]);
  if ((await db.query("SELECT id FROM settings WHERE id='discovery-daniel-v1'")).rows.length)
    return;
  // Populate the requested example account once, never replace a saved consent choice.
  await db.query(
    "UPDATE users SET preferences=preferences || $1::jsonb WHERE id='daniel' AND deleted=false AND NOT EXISTS(SELECT 1 FROM consents WHERE user_id='daniel')",
    [{ personalisation: true, tastes: ['Pub classics', 'Burgers', 'Ale'] }],
  );
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'discovery-daniel-v1',
    { seeded: true },
  ]);
}
function matches(item: MenuItem, taste: string) {
  if (taste === 'Plant-based') return item.dietary.some((d) => /^Vegan\b/.test(d));
  return (
    (
      {
        'Pub classics': 'Pub classics',
        Burgers: 'Burgers',
        'Light bites': 'Light bites',
        'Sweet treats': 'Desserts',
      } as Record<string, string>
    )[taste] === item.category
  );
}
export async function memberDiscovery(db: DB, userId: string) {
  const profile = (
    await db.query('SELECT preferences FROM users WHERE id=$1 AND deleted=false', [userId])
  ).rows[0];
  if (!profile) throw new Error('Member unavailable');
  const prefs = profile.preferences;
  const personalised = prefs.personalisation === true;
  const tastes: string[] = personalised ? prefs.tastes || [] : [];
  const menu: MenuItem[] = (await db.query('SELECT data FROM menu')).rows.map((r) => r.data);
  const config = (await db.query("SELECT data FROM settings WHERE id='discovery-picks-v1'")).rows[0]
    ?.data || { food: defaults, drinks: ['ale', 'soft'] };
  const food = menu.filter(
    (m) =>
      m.available &&
      !m.alcohol &&
      m.category !== 'Drinks' &&
      (m.menuEdition || 'main') === 'main' &&
      (!tastes.includes('Plant-based') || matches(m, 'Plant-based')),
  );
  const history = personalised
    ? (
        await db.query(
          "SELECT oi.item_id, SUM(oi.quantity)::int AS quantity FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.user_id=$1 AND o.payment='paid' AND o.status='completed' GROUP BY oi.item_id",
          [userId],
        )
      ).rows
    : [];
  const purchased = new Map<string, number>(history.map((h) => [h.item_id, Number(h.quantity)]));
  const categoryHistory = new Map<string, number>();
  for (const m of menu)
    if (purchased.has(m.id))
      categoryHistory.set(
        m.category,
        (categoryHistory.get(m.category) || 0) + purchased.get(m.id)!,
      );
  const rank = (m: MenuItem) => {
    const preference = tastes.some((t) => matches(m, t)) ? 100 : 0;
    const repeat = Math.min(purchased.get(m.id) || 0, 5) * 5;
    const category = Math.min(categoryHistory.get(m.category) || 0, 5) * 3;
    const index = config.food.indexOf(m.id);
    return preference + repeat + category + (index < 0 ? 0 : 12 - index);
  };
  const card = (m: MenuItem, reason: string) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    category: m.category,
    imageKey: m.imageKey || m.id,
    price: m.price,
    orderable: m.available,
    alcohol: m.alcohol,
    reason,
  });
  const suggestions = [...food]
    .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map((m) =>
      card(
        m,
        !personalised
          ? 'A pick from the René kitchen'
          : tastes.some((t) => matches(m, t))
            ? 'Matches your saved tastes'
            : purchased.has(m.id)
              ? 'One of your previous choices'
              : categoryHistory.has(m.category)
                ? 'More from a category you enjoy'
                : 'Something new to try',
      ),
    );
  const popular = config.food
    .map((id: string) => food.find((m) => m.id === id))
    .filter(Boolean)
    .slice(0, 4)
    .map((m: MenuItem) => card(m, 'From the René favourites board'));
  const drinks = config.drinks
    .map((id: string) => menu.find((m) => m.id === id))
    .filter((m: MenuItem | undefined) => m && (!tastes.includes('Alcohol-free') || !m.alcohol))
    .map((m: MenuItem) => ({
      ...card(
        m,
        personalised &&
          ((m.alcohol && tastes.includes('Ale')) || (!m.alcohol && tastes.includes('Alcohol-free')))
          ? 'Matches your saved drink preference'
          : 'Ask the bar team for today’s selection',
      ),
      price: null,
      orderable: false,
      imageKey: 'venue-bar',
    }));
  return {
    personalised,
    tastes: prefs.tastes || [],
    popular,
    drinks,
    suggestions,
    note: 'Favourites are selected picks. Availability and allergens are confirmed by the team.',
  };
}
