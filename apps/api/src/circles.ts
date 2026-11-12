import { enqueuePush } from './push.ts';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID, createHash } from 'node:crypto';
import { Service, demand } from './service.ts';
export function circleRoutes(s: Service) {
  const r = express.Router();
  r.use(
    rateLimit({
      windowMs: 60000,
      limit: 90,
      message: { error: 'Too many requests. Try again shortly.' },
    }),
  );
  r.use((req: any, _res, next) => {
    demand(req.user, 'Sign in to use your private circle', 401);
    next();
  });
  const active = async (id: string, userId: string) => {
    const m = await s.one(
      "SELECT c.*,m.status FROM circles c JOIN circle_members m ON m.circle_id=c.id WHERE c.id=$1 AND m.user_id=$2 AND m.status='active'",
      [id, userId],
    );
    demand(m, 'You are not a member of this conversation', 403);
    return m;
  };
  r.get('/directory', async (req: any, res) => {
    const q = z
      .string()
      .max(80)
      .parse(req.query.q || '');
    res.json(
      q
        ? (
            await s.db.query(
              "SELECT p.user_id AS id,p.display_name AS name FROM social_profiles p JOIN users u ON u.id=p.user_id WHERE p.discoverable=true AND u.deleted=false AND u.role='customer' AND u.id<>$1 AND lower(p.display_name) LIKE lower($2) LIMIT 20",
              [req.user.id, '%' + q + '%'],
            )
          ).rows
        : [],
    );
  });
  r.get('/profile', async (req: any, res) =>
    res.json(
      (await s.one('SELECT * FROM social_profiles WHERE user_id=$1', [req.user.id])) || {
        user_id: req.user.id,
        display_name: req.user.name,
        discoverable: false,
      },
    ),
  );
  r.put('/profile', async (req: any, res) => {
    const d = z
      .object({ displayName: z.string().trim().min(1).max(80), discoverable: z.boolean() })
      .strict()
      .parse(req.body);
    await s.db.query(
      'INSERT INTO social_profiles VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET display_name=$2,discoverable=$3',
      [req.user.id, d.displayName, d.discoverable],
    );
    res.json({ ok: true });
  });
  r.get('/', async (req: any, res) =>
    res.json(
      (
        await s.db.query(
          "SELECT c.id,c.title,c.owner_id,c.direct_key IS NOT NULL AS direct,m.status,(SELECT count(*) FROM circle_members cm WHERE cm.circle_id=c.id AND cm.status='active') AS members FROM circles c JOIN circle_members m ON m.circle_id=c.id WHERE m.user_id=$1 AND m.status IN ('active','invited') ORDER BY c.created_at DESC",
          [req.user.id],
        )
      ).rows,
    ),
  );
  r.post('/', async (req: any, res) => {
    const d = z
      .object({ title: z.string().trim().min(1).max(100) })
      .strict()
      .parse(req.body);
    const id = randomUUID();
    await s.db.transaction(async (db) => {
      await db.query('INSERT INTO circles(id,owner_id,title) VALUES($1,$2,$3)', [
        id,
        req.user.id,
        d.title,
      ]);
      await db.query("INSERT INTO circle_members VALUES($1,$2,'active')", [id, req.user.id]);
    });
    res.json({ id });
  });
  r.post('/direct', async (req: any, res) => {
    const d = z.object({ userId: z.string() }).strict().parse(req.body);
    demand(d.userId !== req.user.id, 'Choose another member');
    const target = await s.one(
      'SELECT p.* FROM social_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND p.discoverable=true AND u.deleted=false',
      [d.userId],
    );
    demand(target, 'Member is unavailable');
    const key = createHash('sha256').update([req.user.id, d.userId].sort().join(':')).digest('hex');
    let id = randomUUID();
    await s.db.transaction(async (db) => {
      const added = await db.query(
        'INSERT INTO circles(id,owner_id,title,direct_key) VALUES($1,$2,$3,$4) ON CONFLICT(direct_key) DO NOTHING RETURNING id',
        [id, req.user.id, 'Private conversation', key],
      );
      if (!added.rows.length) {
        id = (await db.query('SELECT id FROM circles WHERE direct_key=$1', [key])).rows[0].id;
        return;
      }
      await db.query("INSERT INTO circle_members VALUES($1,$2,'active'),($1,$3,'invited')", [
        id,
        req.user.id,
        d.userId,
      ]);
    });
    res.json({
      id,
      message: 'Private invitation created. No email, SMS or push notification sent.',
    });
  });
  r.post('/:id/respond', async (req: any, res) => {
    const d = z.object({ accept: z.boolean() }).strict().parse(req.body);
    const updated = await s.db.query(
      "UPDATE circle_members SET status=$1 WHERE circle_id=$2 AND user_id=$3 AND status='invited' RETURNING circle_id",
      [d.accept ? 'active' : 'declined', req.params.id, req.user.id],
    );
    demand(updated.rows.length, 'Invitation not found', 404);
    res.json({ ok: true });
  });
  r.get('/:id', async (req: any, res) => {
    const group = await active(req.params.id, req.user.id);
    const members = (
      await s.db.query(
        "SELECT m.user_id AS id,coalesce(p.display_name,u.name) AS name,m.status FROM circle_members m JOIN users u ON u.id=m.user_id LEFT JOIN social_profiles p ON p.user_id=u.id WHERE m.circle_id=$1 AND m.status IN ('active','invited')",
        [group.id],
      )
    ).rows;
    const messages = (
      await s.db.query(
        "SELECT m.id,m.author_id,m.body,m.created_at,coalesce(p.display_name,u.name,'Deleted member') AS name FROM circle_messages m LEFT JOIN users u ON u.id=m.author_id LEFT JOIN social_profiles p ON p.user_id=m.author_id WHERE m.circle_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 100",
        [group.id],
      )
    ).rows.reverse();
    const plans = (
      await s.db.query('SELECT * FROM circle_plans WHERE circle_id=$1 ORDER BY starts_at', [
        group.id,
      ])
    ).rows;
    const replies = (
      await s.db.query(
        'SELECT r.* FROM circle_rsvps r JOIN circle_plans p ON p.id=r.plan_id WHERE p.circle_id=$1',
        [group.id],
      )
    ).rows;
    res.json({
      group,
      members,
      messages,
      plans: plans.map((p) => ({ ...p, rsvps: replies.filter((r) => r.plan_id === p.id) })),
    });
  });
  r.post('/:id/invite', async (req: any, res) => {
    const group = await active(req.params.id, req.user.id);
    demand(
      group.owner_id === req.user.id && !group.direct_key,
      'Only the group owner can invite members',
      403,
    );
    const d = z.object({ userId: z.string() }).strict().parse(req.body);
    demand(
      await s.one(
        'SELECT p.user_id FROM social_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND p.discoverable=true AND u.deleted=false',
        [d.userId],
      ),
      'Member unavailable',
    );
    await s.db.query("INSERT INTO circle_members VALUES($1,$2,'invited') ON CONFLICT DO NOTHING", [
      group.id,
      d.userId,
    ]);
    res.json({ message: 'Invitation saved in the app. No external message sent.' });
  });
  r.post(
    '/:id/messages',
    rateLimit({
      windowMs: 60000,
      limit: 20,
      message: { error: 'Please wait before sending more messages.' },
    }),
    async (req: any, res) => {
      await active(req.params.id, req.user.id);
      const d = z
        .object({ body: z.string().trim().min(1).max(2000), clientId: z.string().uuid() })
        .strict()
        .parse(req.body);
      await s.db.transaction(async (db) => {
        const inserted = await db.query(
          'INSERT INTO circle_messages(id,circle_id,author_id,body,client_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id',
          [randomUUID(), req.params.id, req.user.id, d.body, d.clientId],
        );
        if (inserted.rows.length) {
          const recipients = (
            await db.query(
              "SELECT user_id FROM circle_members WHERE circle_id=$1 AND status='active' AND user_id<>$2",
              [req.params.id, req.user.id],
            )
          ).rows.map((r) => r.user_id);
          await enqueuePush(
            db,
            'message:' + inserted.rows[0].id,
            'messages',
            'Your René Circle',
            'You have a new message.',
            { screen: 'My René', circleId: req.params.id },
            recipients,
          );
        }
      });
      res.json({ ok: true });
    },
  );
  r.post('/:id/plans', async (req: any, res) => {
    await active(req.params.id, req.user.id);
    const d = z
      .object({
        title: z.string().trim().min(1).max(100),
        date: z.string().datetime(),
        notes: z.string().max(500),
      })
      .strict()
      .parse(req.body);
    demand(new Date(d.date) > new Date(), 'Choose a future date');
    const id = randomUUID();
    await s.db.query(
      'INSERT INTO circle_plans(id,circle_id,creator_id,title,starts_at,notes) VALUES($1,$2,$3,$4,$5,$6)',
      [id, req.params.id, req.user.id, d.title, d.date, d.notes],
    );
    res.json({ id });
  });
  r.put('/:id/plans/:plan/rsvp', async (req: any, res) => {
    await active(req.params.id, req.user.id);
    demand(
      await s.one('SELECT id FROM circle_plans WHERE id=$1 AND circle_id=$2', [
        req.params.plan,
        req.params.id,
      ]),
      'Plan not found',
      404,
    );
    const d = z
      .object({ response: z.enum(['yes', 'maybe', 'no']) })
      .strict()
      .parse(req.body);
    await s.db.query(
      'INSERT INTO circle_rsvps VALUES($1,$2,$3) ON CONFLICT(plan_id,user_id) DO UPDATE SET response=$3',
      [req.params.plan, req.user.id, d.response],
    );
    res.json({ ok: true });
  });
  return r;
}
