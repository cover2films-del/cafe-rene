import { seedDiscovery } from './discovery.ts';
import { publishedMenu } from '../../../packages/shared/src/venue-menu.ts';
import { seedDaniel } from './demo-daniel.ts';
import { officialProgramme } from '../../../packages/shared/src/content.ts';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { challenges } from '../../../packages/shared/src/index.ts';
import type { DB } from './db.ts';
import { randomBytes, scryptSync } from 'node:crypto';
export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
};
export async function seed(db: DB) {
  return db.transaction(seedDefaults);
}
async function seedDefaults(db: DB) {
  for (const role of ['customer', 'staff', 'manager', 'admin'])
    await db.query(
      'INSERT INTO users(id,email,password,role,name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [role, `${role}@demo.rene`, hashPassword('ReneDemo2026!'), role, `Demo ${role}`],
    );
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'ordering',
    {
      open: true,
      collection: true,
      timezone: 'Europe/London',
      enforceHours: false,
      coordinates: null,
      radius: 100,
      dwellSeconds: 30,
    },
  ]);
  for (let n = 1; n <= 12; n++)
    await db.query('INSERT INTO tables(id,label) VALUES($1,$2) ON CONFLICT DO NOTHING', [
      `table-${n}`,
      `Table ${n}`,
    ]);
  for (const item of publishedMenu) {
    await db.query('INSERT INTO menu VALUES($1,$2) ON CONFLICT DO NOTHING', [item.id, item]);
    // Attach published provenance to existing items, preserving manager-edited names/prices.
    await db.query(
      "UPDATE menu SET data=data || $2::jsonb WHERE id=$1 AND NOT (data ? 'sourceUrl')",
      [
        item.id,
        {
          sourceUrl: item.sourceUrl,
          sourceChecked: item.sourceChecked,
          menuEdition: item.menuEdition,
          imageKey: item.imageKey,
        },
      ],
    );
  }
  // Existing history fixtures reference these IDs; no published drinks prices were found.
  for (const [id, name] of [
    ['soft', 'Soft drink'],
    ['ale', 'Guest ale'],
  ])
    await db.query('INSERT INTO menu VALUES($1,$2) ON CONFLICT DO NOTHING', [
      id,
      {
        id,
        name,
        description: 'Ask the bar team for the current selection and price.',
        category: 'Drinks',
        price: id === 'ale' ? 500 : 300,
        dietary: [],
        modifiers: [],
        available: false,
        approved: false,
        alcohol: id === 'ale',
        allergens: null,
      },
    ]);
  await db.query(
    "UPDATE menu SET data=data || $1::jsonb WHERE id IN ('soft','ale') AND NOT (data ? 'sourceUrl') AND NOT (data ? 'menuEdition')",
    [{ menuEdition: 'bar', available: false }],
  );
  const base = new Date();
  base.setUTCHours(21, 0, 0, 0);
  for (const [i, title, genre, description] of [
    [1, 'A night of blues', 'Blues', 'A sample evening of live blues in the heart of Gloucester.'],
    [3, 'Cellar selections', 'DJ', 'A sample late-night soundtrack.'],
    [7, 'Sunday acoustic session', 'Acoustic', 'A sample stripped-back performance.'],
  ] as const) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    await db.query('INSERT INTO events VALUES($1,$2) ON CONFLICT DO NOTHING', [
      `event-${i}`,
      {
        id: `event-${i}`,
        title,
        genre,
        date: d.toISOString(),
        description,
        sample: true,
        free: true,
      },
    ]);
  }
  await db.query('INSERT INTO offers VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'welcome',
    {
      id: 'welcome',
      name: 'A little welcome back',
      description: '£2 off an eligible food order of £10 or more.',
      discount: 200,
      min: 1000,
      points: 0,
      expires: new Date(Date.now() + 30 * 864e5).toISOString(),
      sample: true,
    },
  ]);
  await db.query('INSERT INTO offers VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'regular-treat',
    {
      id: 'regular-treat',
      name: 'Your regular’s reward',
      description: 'Redeem 50 demo points for £5 off food.',
      discount: 500,
      min: 1000,
      points: 50,
      expires: new Date(Date.now() + 30 * 864e5).toISOString(),
      sample: true,
    },
  ]);
  for (const event of officialProgramme)
    await db.query('INSERT INTO events VALUES($1,$2) ON CONFLICT DO NOTHING', [event.id, event]);
  await db.query(
    "UPDATE events SET data=jsonb_set(data,'{imageKind}',to_jsonb('venue-programme'::text)) WHERE data->>'imageKind'='original-artwork' AND data->>'sourceUrl'=$1",
    ['https://www.caferene.co.uk/events32897205y0w609734'],
  );
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'challenges',
    challenges,
  ]);
  const manifest = JSON.parse(
    await readFile(
      fileURLToPath(new URL('../../../docs/content-sources.json', import.meta.url)),
      'utf8',
    ),
  );
  for (const [i, source] of manifest.sources.entries())
    await db.query('INSERT INTO content(id,data,status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [
      'source-' + i,
      { title: source.url, url: source.url, text: source.issues.join('\n'), ...source },
      'needs_review',
    ]);
  await seedDaniel(db);
  await seedDiscovery(db);
  await db.query(
    "UPDATE users SET name=replace(name,' (sample)','') WHERE id IN ('demo-alex','demo-sam') AND name IN ('Alex (sample)','Sam (sample)')",
  );
  await db.query(
    "UPDATE social_profiles SET display_name=replace(display_name,' (sample)','') WHERE user_id IN ('demo-alex','demo-sam') AND display_name IN ('Alex (sample)','Sam (sample)')",
  );
  for (const [before, after] of [
    ['Demo Alex', 'Alex'],
    ['Demo Sam', 'Sam'],
  ]) {
    await db.query('UPDATE users SET name=$2 WHERE name=$1', [before, after]);
    await db.query('UPDATE social_profiles SET display_name=$2 WHERE display_name=$1', [
      before,
      after,
    ]);
  }
  await db.query(
    "UPDATE circles SET title='Friday at René' WHERE id='demo-friday-circle' AND title='Demo · Friday at René'",
  );
  await db.query(
    "UPDATE circle_plans SET title='Food & live music', notes='A sample plan with fictional members. No table or tickets booked.' WHERE id='demo-friday-plan' AND title='Demo · Food & live music'",
  );
  await db.query(
    "UPDATE circle_messages SET body=replace(body,'[Demo]','') WHERE id IN ('demo-message-1','demo-message-2','demo-message-3') AND body LIKE '[Demo]%'",
  );
  await db.query(
    "UPDATE circle_messages SET body=replace(body,'[Sample]','') WHERE id IN ('demo-message-1','demo-message-2','demo-message-3') AND body LIKE '[Sample]%'",
  );
  await db.query(
    "UPDATE offers SET data=jsonb_set(data,'{description}',to_jsonb(replace(data->>'description','demo food order','eligible food order'))) WHERE id IN ('welcome','kitchen-six') AND data->>'description' LIKE '%demo food order%'",
  );
}
