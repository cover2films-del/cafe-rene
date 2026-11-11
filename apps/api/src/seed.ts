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
  const items = [
    [
      'burger',
      'Desperate Dan Burger',
      'An 8oz British beef burger. A René favourite.',
      'Burgers',
      1495,
      [],
      [
        { id: 'cheese', name: 'Add cheese', price: 200 },
        { id: 'bacon', name: 'Add smoked bacon', price: 250 },
      ],
    ],
    [
      'veggie',
      'Homemade Veggie Burger',
      'A hearty plant-based choice from the official menu.',
      'Burgers',
      1395,
      ['Vegan (menu label)'],
      [],
    ],
    [
      'cod',
      'Beer-Battered Cod & Chips',
      'With chunky chips, mushy peas and tartare sauce.',
      'Pub classics',
      1895,
      [],
      [],
    ],
    [
      'beef',
      'Beef Bourguignon',
      'Slow-braised beef, mash and seasonal vegetables.',
      'Pub classics',
      1695,
      [],
      [],
    ],
    [
      'chilli',
      'Black Bean Chilli',
      'Sweet potato and black beans, rice and avocado.',
      'Pub classics',
      1495,
      ['Vegan (menu label)'],
      [],
    ],
    [
      'soup',
      'Soup of the Day',
      'Bread and butter on the side. Ask the team about today’s soup.',
      'Light bites',
      625,
      ['Vegetarian (menu label)'],
      [],
    ],
    [
      'fries',
      'Skinny Fries',
      'A little something for the table.',
      'Sides',
      445,
      ['Vegan (menu label)'],
      [],
    ],
    ['brownie', 'Chocolate Brownie', 'Something sweet to finish.', 'Desserts', 745, [], []],
    [
      'soft',
      'Sparkling soft drink',
      'Demonstration drink, not imported from a verified drinks menu.',
      'Drinks',
      300,
      [],
      [],
    ],
    [
      'ale',
      'Guest ale',
      'Demonstration alcohol item. Staff age verification required.',
      'Drinks',
      500,
      [],
      [],
    ],
  ];
  for (const [id, name, description, category, price, dietary, modifiers] of items)
    await db.query('INSERT INTO menu VALUES($1,$2) ON CONFLICT DO NOTHING', [
      id,
      {
        id,
        name,
        description,
        category,
        price,
        dietary,
        modifiers,
        available: true,
        approved: false,
        alcohol: id === 'ale',
        allergens: null,
      },
    ]);
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
      description: '£2 off a demo food order of £10 or more.',
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
}
