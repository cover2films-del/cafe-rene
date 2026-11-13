import type { DB } from './db.ts';
import { hashPassword } from './seed.ts';
import { venueDay } from '../../../packages/shared/src/index.ts';
export async function seedDaniel(db: DB) {
  if ((await db.query("SELECT id FROM settings WHERE id='demo-daniel-v1'")).rows.length) return;
  for (const [id, name] of [
    ['daniel', 'Daniel Woolf'],
    ['demo-alex', 'Demo Alex'],
    ['demo-sam', 'Demo Sam'],
  ])
    await db.query(
      'INSERT INTO users(id,email,password,role,name) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
      [id, id + '@demo.rene', hashPassword('ReneDemo2026!'), 'customer', name],
    );
  const member = (await db.query('SELECT deleted FROM users WHERE id=$1', ['daniel'])).rows[0];
  if (!member || member.deleted) return;
  for (const [id, name] of [
    ['daniel', 'Daniel Woolf'],
    ['demo-alex', 'Demo Alex'],
    ['demo-sam', 'Demo Sam'],
  ])
    await db.query('INSERT INTO social_profiles VALUES($1,$2,true) ON CONFLICT DO NOTHING', [
      id,
      name,
    ]);
  const history = [
    {
      day: 10,
      items: [
        ['burger', 1, 1495, 'Desperate Dan Burger'],
        ['peroni', 1, 500, 'Peroni Nastro Azzurro'],
      ],
    },
    {
      day: 6,
      items: [
        ['cod', 1, 1895, 'Beer-Battered Cod & Chips'],
        ['mojito', 1, 850, 'Mojito'],
      ],
    },
    {
      day: 2,
      items: [
        ['chilli', 1, 1495, 'Black Bean Chilli'],
        ['fries', 1, 445, 'Skinny Fries'],
      ],
    },
  ];
  for (const [index, visit] of history.entries()) {
    const id = 'de000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'),
      date = new Date();
    date.setUTCDate(date.getUTCDate() - visit.day);
    date.setUTCHours(18, 30, 0, 0);
    const total = visit.items.reduce((n, l) => n + Number(l[1]) * Number(l[2]), 0),
      food = visit.items
        .filter((l) => !['ale', 'soft', 'peroni', 'guinness', 'negroni', 'mojito', 'espresso'].includes(String(l[0])))
        .reduce((n, l) => n + Number(l[1]) * Number(l[2]), 0);
    await db.query(
      "INSERT INTO orders(id,user_id,request_key,table_id,total,payment,status,notes,alcohol,age_checked,pos_ref,created_at) VALUES($1,'daniel',$2,'table-2',$3,'paid','completed',$4,$5,true,$6,$7) ON CONFLICT DO NOTHING",
      [
        id,
        'demo-history-daniel-' + index,
        total,
        'DEMO HISTORY: sample items, not actual purchases.',
        visit.items.some((l) => l[0] === 'ale'),
        'MOCK-HISTORY-' + id,
        date.toISOString(),
      ],
    );
    for (const [j, line] of visit.items.entries())
      await db.query(
        'INSERT INTO order_items VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING',
        ['demo-daniel-line-' + index + '-' + j, id, line[0], line[3], line[1], line[2], []],
      );
    await db.query("INSERT INTO payments VALUES($1,$2,'mock',$3,'paid') ON CONFLICT DO NOTHING", [
      'mock_' + id,
      id,
      total,
    ]);
    await db.query(
      "INSERT INTO loyalty(id,user_id,order_id,points,reason,created_at) VALUES($1,'daniel',$2,$3,'purchase',$4) ON CONFLICT DO NOTHING",
      ['demo-daniel-points-' + index, id, Math.floor(food / 100), date.toISOString()],
    );
    await db.query(
      "INSERT INTO visits(id,user_id,day,method) VALUES($1,'daniel',$2,$3) ON CONFLICT DO NOTHING",
      ['demo-daniel-visit-' + index, venueDay(date), 'purchase:' + id],
    );
  }
  await db.query(
    "INSERT INTO loyalty(id,user_id,points,reason) VALUES('demo-daniel-welcome','daniel',49,'demo welcome gift') ON CONFLICT DO NOTHING",
  );
  await db.query('INSERT INTO offers VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'kitchen-six',
    {
      id: 'kitchen-six',
      name: 'The Kitchen Club',
      description: 'Collect six food-visit stamps for £5 off a demo food order of £15 or more.',
      discount: 500,
      min: 1500,
      points: 0,
      stampsRequired: 6,
      expires: new Date(Date.now() + 90 * 864e5).toISOString(),
      sample: true,
    },
  ]);
  await db.query(
    "INSERT INTO circles(id,owner_id,title) VALUES('demo-friday-circle','daniel','Demo · Friday at René') ON CONFLICT DO NOTHING",
  );
  for (const id of ['daniel', 'demo-alex', 'demo-sam'])
    await db.query(
      "INSERT INTO circle_members VALUES('demo-friday-circle',$1,'active') ON CONFLICT DO NOTHING",
      [id],
    );
  for (const [i, author, body] of [
    [1, 'daniel', '[Demo] Fancy food and live music at René?'],
    [2, 'demo-alex', '[Demo] Sounds good. Let’s make a plan here.'],
    [3, 'demo-sam', '[Demo] I’m in — looking forward to it.'],
  ] as const)
    await db.query(
      "INSERT INTO circle_messages(id,circle_id,author_id,body,client_id) VALUES($1,'demo-friday-circle',$2,$3,$1) ON CONFLICT DO NOTHING",
      ['demo-message-' + i, author, body],
    );
  const friday = new Date();
  friday.setUTCDate(friday.getUTCDate() + ((5 - friday.getUTCDay() + 7) % 7 || 7));
  friday.setUTCHours(19, 0, 0, 0);
  await db.query(
    "INSERT INTO circle_plans(id,circle_id,creator_id,title,starts_at,notes) VALUES('demo-friday-plan','demo-friday-circle','daniel','Demo · Food & live music',$1,'A sample plan with fictional demo members. No table or tickets booked.') ON CONFLICT DO NOTHING",
    [friday.toISOString()],
  );
  for (const [id, response] of [
    ['daniel', 'yes'],
    ['demo-alex', 'maybe'],
    ['demo-sam', 'yes'],
  ])
    await db.query(
      "INSERT INTO circle_rsvps VALUES('demo-friday-plan',$1,$2) ON CONFLICT DO NOTHING",
      [id, response],
    );
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'demo-daniel-v1',
    { seededAt: new Date().toISOString() },
  ]);
}
