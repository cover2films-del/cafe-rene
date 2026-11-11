import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Service, Fault, demand, digest } from './service.ts';
import { LocalMedia, optimiseImage, mediaRoot } from './media.ts';
import { venue } from '../../../packages/shared/src/index.ts';
export function createApp(s: Service) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, done) => {
        const allowed = (
          process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173'
        ).split(',');
        done(null, !origin || allowed.includes(origin));
      },
      credentials: true,
    }),
  );
  const limited = rateLimit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth', limited);
  app.use('/api/checkin', limited);
  app.use('/api/orders', rateLimit({ windowMs: 60000, limit: 60 }));
  app.post(
    '/api/webhooks/payment',
    express.raw({ type: 'application/json', limit: '32kb' }),
    async (req, res) => {
      await s.webhook(req.body, req.header('x-signature') || '');
      res.json({ received: true });
    },
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(async (req: any, _res, next) => {
    try {
      const bearer = req.header('authorization')?.replace(/^Bearer /, '');
      const cookie = req.headers.cookie
        ?.split('; ')
        .find((c: string) => c.startsWith('rene_session='))
        ?.slice(13);
      const token = bearer || cookie;
      req.sessionToken = token;
      try {
        req.user = token ? await s.auth(token) : null;
      } catch (e) {
        if (e instanceof Fault && e.status === 401) req.user = null;
        else throw e;
      }
      next();
    } catch (e) {
      next(e);
    }
  });
  const route = (
    method: string,
    path: string,
    fn: (req: any) => Promise<any> | any,
    roles?: string[],
  ) => {
    (app as any)[method](path, async (req: any, res: any) => {
      if (roles) s.role(req.user, roles);
      const result = await fn(req);
      res.json(result ?? { ok: true });
    });
  };
  const staff = ['staff', 'manager', 'admin'],
    manager = ['manager', 'admin'],
    customer = ['customer', 'staff', 'manager', 'admin'];
  route('get', '/api/health', () => ({
    ok: true,
    mode: 'demo',
    database: process.env.DATABASE_URL ? 'postgresql' : 'pglite',
    payment: 'mock',
    pos: 'mock',
  }));
  route('get', '/api/bootstrap', async () => ({
    mode: 'demo',
    venue,
    menu: await s.menu(),
    events: (await s.db.query('SELECT data FROM events')).rows
      .map((r) => r.data)
      .filter((e) => new Date(e.date).getTime() > Date.now())
      .sort((a, b) => a.date.localeCompare(b.date)),
    ordering: await s.settings(),
  }));
  app.post('/api/auth/login', async (req, res) => {
    const d = z.object({ email: z.string(), password: z.string().max(128) }).parse(req.body);
    const result = await s.login(d.email, d.password);
    res.cookie('rene_session', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 864e5,
      path: '/api',
    });
    res.json(req.header('x-native-client') === 'true' ? result : { user: result.user });
  });
  app.post('/api/auth/register', async (req, res) => {
    const result = await s.register(req.body);
    res.cookie('rene_session', result.token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.COOKIE_SECURE === 'true',
      maxAge: 7 * 864e5,
      path: '/api',
    });
    res.json(req.header('x-native-client') === 'true' ? result : { user: result.user });
  });
  app.post('/api/auth/logout', async (req: any, res) => {
    if (req.sessionToken)
      await s.db.query('DELETE FROM sessions WHERE token=$1', [digest(req.sessionToken)]);
    res.clearCookie('rene_session', { path: '/api' });
    res.json({ ok: true });
  });
  route('get', '/api/me', (req) => req.user, customer);
  route('get', '/api/demo/table/:number', async (req) => {
    const t = await s.one('SELECT * FROM tables WHERE id=$1 AND enabled=true', [
      `table-${req.params.number}`,
    ]);
    demand(t, 'Table not found', 404);
    return { label: t.label, ref: s.reference('table', t.id, t.version, 86400) };
  });
  route('post', '/api/table/validate', async (req) => {
    const t = await s.table(z.string().parse(req.body.ref));
    return { label: t.label, id: t.id };
  });
  route('post', '/api/orders', (req) => s.checkout(req.body, req.user));
  route(
    'get',
    '/api/orders',
    async (req) =>
      (
        await s.db.query(
          'SELECT id,total,payment,status,created_at FROM orders WHERE user_id=$1 ORDER BY created_at DESC',
          [req.user.id],
        )
      ).rows,
    customer,
  );
  route('get', '/api/orders/:id', (req) =>
    s.order(req.params.id, req.user, req.header('x-guest-secret')),
  );
  route('post', '/api/orders/:id/mock-pay', (req) =>
    s.mockPay(req.params.id, req.user, req.header('x-guest-secret')),
  );
  route(
    'post',
    '/api/orders/:id/claim',
    async (req) => {
      demand(req.user, 'Sign in first', 401);
      const o = await s.ownOrder(req.params.id, null, req.header('x-guest-secret'));
      demand(!o.user_id, 'Order already linked');
      await s.db.transaction(async (db) => {
        await db.query(
          'UPDATE orders SET user_id=$1,guest_hash=null WHERE id=$2 AND user_id IS NULL',
          [req.user.id, o.id],
        );
        await s.audit(req.user.id, 'order.claimed', o.id, db);
      });
      return {
        message: 'Ownership verified using receipt secret. Future eligible purchases earn rewards.',
      };
    },
    customer,
  );
  route('post', '/api/orders/:id/cancel', async (req) => {
    const o = await s.ownOrder(req.params.id, req.user, req.header('x-guest-secret'));
    demand(o.payment === 'unpaid', 'Ask staff to resolve paid orders');
    await s.db.transaction(async (db) => {
      const result = await db.query(
        "UPDATE orders SET status='cancelled' WHERE id=$1 AND payment='unpaid' RETURNING id",
        [o.id],
      );
      demand(result.rows.length, 'Payment changed; ask staff for help', 409);
      await db.query("DELETE FROM redemptions WHERE order_id=$1 AND status='reserved'", [o.id]);
      await s.audit(req.user?.id || 'guest', 'order.cancelled', o.id, db);
    });
  });
  route('get', '/api/rewards', (req) => s.rewards(req.user), customer);
  route(
    'post',
    '/api/checkin',
    (req) => s.checkin(req.user, z.string().parse(req.body.ref)),
    customer,
  );
  route('get', '/api/events/:id', async (req) => {
    const e = await s.one('SELECT data FROM events WHERE id=$1', [req.params.id]);
    demand(e, 'Event not found', 404);
    return e.data;
  });
  route(
    'get',
    '/api/favourites',
    async (req) =>
      (await s.db.query('SELECT * FROM favourites WHERE user_id=$1', [req.user.id])).rows,
    customer,
  );
  route(
    'post',
    '/api/favourites/:id',
    async (req) => {
      await s.db.query(
        'INSERT INTO favourites VALUES($1,$2,$3) ON CONFLICT(user_id,event_id) DO UPDATE SET reminder=$3',
        [req.user.id, req.params.id, !!req.body.reminder],
      );
      return {
        message: 'Saved. Reminder preference stored; notification delivery is not connected.',
      };
    },
    customer,
  );
  route(
    'post',
    '/api/tickets/:id',
    async (req) => {
      const e = await s.one('SELECT data FROM events WHERE id=$1', [req.params.id]);
      demand(e && e.data.sample, 'Only sample tickets are available');
      const id = randomUUID();
      await s.db.query(
        'INSERT INTO tickets(id,user_id,event_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [id, req.user.id, req.params.id],
      );
      return { message: 'Demo ticket saved. No real admission booked.' };
    },
    customer,
  );
  route(
    'get',
    '/api/bookings',
    async (req) => ({
      bookings: (await s.db.query('SELECT * FROM bookings WHERE user_id=$1', [req.user.id])).rows,
      tickets: (await s.db.query('SELECT * FROM tickets WHERE user_id=$1', [req.user.id])).rows,
    }),
    customer,
  );
  route(
    'post',
    '/api/bookings',
    async (req) => {
      const d = z
        .object({
          date: z.string().datetime(),
          party: z.number().int().min(1).max(12),
          notes: z.string().max(300),
        })
        .strict()
        .parse(req.body);
      demand(new Date(d.date) > new Date(), 'Choose a future date');
      const id = randomUUID();
      await s.db.query('INSERT INTO bookings(id,user_id,data) VALUES($1,$2,$3)', [
        id,
        req.user.id,
        d,
      ]);
      return {
        id,
        status: 'requested',
        message: 'Demo request only. Call the venue for a real reservation.',
      };
    },
    customer,
  );
  route(
    'put',
    '/api/preferences',
    async (req) => {
      const d = z
        .object({
          personalisation: z.boolean(),
          email: z.boolean(),
          push: z.boolean(),
          location: z.boolean(),
          interests: z.array(z.enum(['Blues', 'DJ', 'Acoustic', 'Food'])).max(4),
        })
        .strict()
        .parse(req.body);
      await s.db.transaction(async (db) => {
        await db.query('UPDATE users SET preferences=$1 WHERE id=$2', [d, req.user.id]);
        await db.query('INSERT INTO consents(id,user_id,version,preferences) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          req.user.id,
          '2026-11-demo-v1',
          d,
        ]);
      });
      return { ...req.user, preferences: d };
    },
    customer,
  );
  route(
    'get',
    '/api/privacy/export',
    async (req) => ({
      profile: await s.one('SELECT id,email,name,role,preferences FROM users WHERE id=$1', [
        req.user.id,
      ]),
      visits: (
        await s.db.query('SELECT day,method,created_at FROM visits WHERE user_id=$1', [req.user.id])
      ).rows,
      validations: (
        await s.db.query('SELECT kind,reference,created_at FROM validations WHERE user_id=$1', [
          req.user.id,
        ])
      ).rows,
      tickets: (
        await s.db.query('SELECT id,event_id,used_at FROM tickets WHERE user_id=$1', [req.user.id])
      ).rows,
      orders: (
        await s.db.query('SELECT id,total,payment,status,created_at FROM orders WHERE user_id=$1', [
          req.user.id,
        ])
      ).rows,
      rewards: await s.rewards(req.user),
      consents: (
        await s.db.query('SELECT version,preferences,created_at FROM consents WHERE user_id=$1', [
          req.user.id,
        ])
      ).rows,
      bookings: (await s.db.query('SELECT * FROM bookings WHERE user_id=$1', [req.user.id])).rows,
      favourites: (await s.db.query('SELECT * FROM favourites WHERE user_id=$1', [req.user.id]))
        .rows,
    }),
    customer,
  );
  route(
    'delete',
    '/api/privacy/account',
    async (req) => {
      demand(req.body.confirm === 'DELETE', 'Type DELETE to confirm');
      demand(req.user.role === 'customer', 'Staff accounts must be removed by an administrator');
      await s.db.transaction(async (db) => {
        for (const t of [
          'sessions',
          'consents',
          'visits',
          'validations',
          'favourites',
          'tickets',
          'bookings',
          'campaign_deliveries',
          'redemptions',
          'loyalty',
        ])
          await db.query(`DELETE FROM ${t} WHERE user_id=$1`, [req.user.id]);
        await db.query('UPDATE orders SET user_id=null,guest_hash=null,notes=$1 WHERE user_id=$2', [
          '[deleted]',
          req.user.id,
        ]);
        await db.query(
          'UPDATE users SET email=$1,password=$2,name=$3,preferences=$4,deleted=true WHERE id=$5',
          [`deleted-${randomUUID()}`, randomUUID(), 'Deleted account', {}, req.user.id],
        );
        await s.audit('privacy', 'account.deleted', 'anonymised', db);
      });
      return { message: 'Account deleted. Anonymised transaction records retained.' };
    },
    customer,
  );
  route(
    'get',
    '/api/staff/queue',
    async () => ({
      orders: (
        await s.db.query(
          "SELECT id,total,payment,status,table_id,collection,alcohol,age_checked,pos_ref,notes,created_at FROM orders WHERE payment='paid' AND status NOT IN ('completed','cancelled') ORDER BY created_at",
        )
      ).rows,
      alerts: (
        await s.db.query(
          "SELECT j.*,o.total,o.payment FROM jobs j JOIN orders o ON o.id=j.order_id WHERE j.status='failed' AND o.payment='paid'",
        )
      ).rows,
    }),
    staff,
  );
  route(
    'post',
    '/api/staff/orders/:id/progress',
    (req) =>
      s.progress(
        req.params.id,
        z.string().parse(req.body.status),
        req.user,
        req.body.ageChecked === true,
      ),
    staff,
  );
  route(
    'post',
    '/api/staff/orders/:id/refund',
    (req) => s.refund(req.params.id, req.user),
    manager,
  );
  route(
    'post',
    '/api/staff/jobs/retry',
    async (req) => {
      await s.db.query(
        "UPDATE jobs SET status='pending',attempts=0,next_at=0 WHERE order_id=$1 AND status='failed'",
        [z.string().parse(req.body.orderId)],
      );
      await s.runJobs();
      await s.audit(req.user.id, 'pos.retry', req.body.orderId);
    },
    manager,
  );
  route(
    'post',
    '/api/staff/demo/fail-pos',
    () => {
      s.pos.failNext = true;
      return { message: 'Next mock POS submission will fail once.' };
    },
    manager,
  );
  route('post', '/api/staff/jobs/run', () => s.runJobs(true), staff);
  route(
    'get',
    '/api/staff/tables',
    async () =>
      (await s.db.query('SELECT * FROM tables ORDER BY id')).rows.map((t) => ({
        ...t,
        ref: s.reference('table', t.id, t.version, 86400),
      })),
    staff,
  );
  route(
    'post',
    '/api/staff/tables/:id',
    async (req) => {
      await s.db.query('UPDATE tables SET enabled=$1,version=version+1 WHERE id=$2', [
        z.boolean().parse(req.body.enabled),
        req.params.id,
      ]);
      await s.audit(req.user.id, 'table.updated', req.params.id);
    },
    manager,
  );
  route(
    'get',
    '/api/staff/checkin-qr',
    () => ({ ref: s.reference('visit', 'venue', 1, 120), expiresIn: 120 }),
    staff,
  );
  route(
    'get',
    '/api/staff/customers',
    async (req) => {
      const q = z
        .string()
        .max(80)
        .parse(req.query.q || '');
      if (!q) return [];
      return (
        await s.db.query(
          "SELECT id,name FROM users WHERE role='customer' AND deleted=false AND (lower(name) LIKE lower($1) OR email=$2) LIMIT 20",
          [`%${q}%`, q],
        )
      ).rows;
    },
    staff,
  );
  route(
    'post',
    '/api/staff/validate',
    async (req) => {
      const d = z
        .object({
          userId: z.string(),
          kind: z.enum(['visit', 'music', 'quiz', 'festival', 'history']),
          reference: z.string().min(1).max(80),
        })
        .strict()
        .parse(req.body);
      const target = await s.one(
        "SELECT id FROM users WHERE id=$1 AND role='customer' AND deleted=false",
        [d.userId],
      );
      demand(target, 'Customer not found');
      if (d.kind === 'visit') {
        await s.db.query(
          'INSERT INTO visits(id,user_id,day,method) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [
            randomUUID(),
            d.userId,
            new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Europe/London',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            }).format(new Date()),
            'staff',
          ],
        );
      } else {
        await s.db.query(
          'INSERT INTO validations(id,user_id,kind,reference,staff_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [randomUUID(), d.userId, d.kind, d.reference, req.user.id],
        );
      }
      await s.audit(req.user.id, 'challenge.validated', `${d.userId}:${d.kind}:${d.reference}`);
    },
    staff,
  );
  route(
    'post',
    '/api/staff/tickets/:id/checkin',
    async (req) => {
      const t = await s.db.query(
        'UPDATE tickets SET used_at=now() WHERE id=$1 AND used_at IS NULL RETURNING *',
        [req.params.id],
      );
      demand(t.rows.length, 'Ticket already used or not found', 409);
      await s.audit(req.user.id, 'ticket.checked_in', req.params.id);
      return t.rows[0];
    },
    staff,
  );
  route(
    'get',
    '/api/manager/overview',
    async () => ({
      sales: (
        await s.db.query(
          "SELECT COALESCE(sum(total) FILTER(WHERE payment='paid'),0) AS sales,COALESCE(sum(total) FILTER(WHERE payment='refunded'),0) AS refunds,count(*) AS orders FROM orders",
        )
      ).rows[0],
      orders: (
        await s.db.query(
          'SELECT id,total,payment,status,created_at FROM orders ORDER BY created_at DESC LIMIT 100',
        )
      ).rows,
      bookings: (await s.db.query('SELECT * FROM bookings ORDER BY created_at DESC')).rows,
      integrations: {
        payment: 'mock',
        pos: 'mock',
        jobs: (await s.db.query('SELECT * FROM jobs ORDER BY next_at')).rows,
        attempts: (await s.db.query('SELECT * FROM pos_attempts ORDER BY created_at DESC LIMIT 30'))
          .rows,
      },
      ordering: await s.settings(),
    }),
    manager,
  );
  route(
    'put',
    '/api/manager/ordering',
    async (req) => {
      const d = z
        .object({
          open: z.boolean(),
          collection: z.boolean(),
          enforceHours: z.boolean(),
          coordinates: z
            .object({
              latitude: z.number().min(-90).max(90),
              longitude: z.number().min(-180).max(180),
            })
            .nullable(),
          radius: z.number().min(20).max(300),
          dwellSeconds: z.number().int().min(15).max(120),
          timezone: z.literal('Europe/London'),
        })
        .strict()
        .parse(req.body);
      await s.db.query('UPDATE settings SET data=$1 WHERE id=$2', [d, 'ordering']);
      await s.audit(req.user.id, 'ordering.updated', 'ordering');
      return d;
    },
    manager,
  );
  route(
    'put',
    '/api/manager/menu/:id',
    async (req) => {
      const item = (await s.menu()).find((i) => i.id === req.params.id);
      demand(item, 'Item not found');
      const d = z
        .object({
          available: z.boolean(),
          approved: z.boolean(),
          price: z.number().int().min(0).max(100000),
        })
        .strict()
        .parse(req.body);
      await s.db.query('UPDATE menu SET data=$1 WHERE id=$2', [{ ...item, ...d }, req.params.id]);
      await s.audit(req.user.id, 'menu.reviewed', req.params.id);
    },
    manager,
  );
  route(
    'post',
    '/api/manager/bookings/:id',
    async (req) => {
      await s.db.query('UPDATE bookings SET status=$1 WHERE id=$2', [
        z.enum(['confirmed', 'declined', 'requested']).parse(req.body.status),
        req.params.id,
      ]);
      await s.audit(req.user.id, 'booking.updated', req.params.id);
    },
    manager,
  );
  const media = new LocalMedia();
  route(
    'post',
    '/api/manager/media',
    async (req) => {
      const d = z
        .object({
          title: z.string().min(1).max(160),
          sourceUrl: z.union([z.url(), z.literal('')]),
          permission: z.enum(['unknown', 'authorised']),
          base64: z.string().min(8).max(1100000),
        })
        .strict()
        .parse(req.body);
      let bytes: Buffer;
      try {
        bytes = await optimiseImage(d.base64);
      } catch {
        throw new Fault(
          400,
          'Invalid image. Upload a PNG, JPEG or WebP below 800 KB and 20 megapixels.',
        );
      }
      const id = randomUUID(),
        key = id + '.webp';
      await media.put(key, bytes, 'image/webp');
      try {
        await s.db.transaction(async (db) => {
          await db.query('INSERT INTO content(id,data) VALUES($1,$2)', [
            id,
            {
              title: d.title,
              url: d.sourceUrl,
              text: 'Uploaded image: re-encoded WebP, metadata removed, max 1400px.',
              type: 'image',
              assetPath: key,
              previewUrl: '/api/manager/media/' + id,
              permission: d.permission,
              retrievedAt: new Date().toISOString(),
              confidence: 'manager_supplied',
              review: 'needs_review',
            },
          ]);
          await s.audit(req.user.id, 'media.imported', id, db);
        });
      } catch (e) {
        await media.remove(key);
        throw e;
      }
      return { id, previewUrl: '/api/manager/media/' + id };
    },
    manager,
  );
  app.get('/api/manager/media/:id', async (req: any, res) => {
    s.role(req.user, manager);
    demand(/^[a-f0-9-]{36}$/.test(req.params.id), 'Image not found', 404);
    const content = await s.one('SELECT data FROM content WHERE id=$1', [req.params.id]);
    demand(content?.data.type === 'image', 'Image not found', 404);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.sendFile(req.params.id + '.webp', { root: mediaRoot });
  });
  route(
    'get',
    '/api/manager/content',
    async () => (await s.db.query('SELECT * FROM content ORDER BY created_at DESC')).rows,
    manager,
  );
  route(
    'post',
    '/api/manager/content',
    async (req) => {
      const d = z
        .object({
          title: z.string().min(1).max(160),
          url: z.union([z.url(), z.literal('')]),
          text: z.string().min(1).max(20000),
          type: z.enum(['text', 'csv', 'image-reference']),
          publicationDate: z.string().max(40),
          permission: z.enum(['unknown', 'authorised']),
        })
        .strict()
        .parse(req.body);
      const id = randomUUID();
      await s.db.query('INSERT INTO content(id,data) VALUES($1,$2)', [
        id,
        {
          ...d,
          retrievedAt: new Date().toISOString(),
          confidence: 'unverified',
          review: 'needs_review',
          assetPath: null,
        },
      ]);
      await s.audit(req.user.id, 'content.imported', id);
      return { id };
    },
    manager,
  );
  route(
    'post',
    '/api/manager/content/:id/review',
    async (req) => {
      await s.db.query('UPDATE content SET status=$1 WHERE id=$2', [
        z.enum(['approved', 'rejected', 'needs_review']).parse(req.body.status),
        req.params.id,
      ]);
      await s.audit(req.user.id, 'content.reviewed', req.params.id);
    },
    manager,
  );
  route(
    'get',
    '/api/manager/campaigns',
    async () => (await s.db.query('SELECT * FROM campaigns ORDER BY created_at DESC')).rows,
    manager,
  );
  route(
    'post',
    '/api/manager/campaigns',
    async (req) => {
      const d = z
        .object({
          name: z.string().min(1).max(80),
          interest: z.enum(['', 'Blues', 'DJ', 'Acoustic', 'Food']),
          channel: z.enum(['email', 'push']),
          offerId: z.string(),
          budget: z.number().min(0).max(100000),
          limit: z.number().int().min(1).max(10000),
          schedule: z.string().datetime(),
          approved: z.boolean(),
        })
        .strict()
        .parse(req.body);
      const id = randomUUID();
      await s.db.query('INSERT INTO campaigns(id,data) VALUES($1,$2)', [id, d]);
      await s.audit(req.user.id, 'campaign.created', id);
      return { id, eligible: (await s.campaignAudience(d)).length };
    },
    manager,
  );
  route(
    'get',
    '/api/manager/campaigns/:id/preview',
    async (req) => {
      const c = await s.one('SELECT * FROM campaigns WHERE id=$1', [req.params.id]);
      demand(c, 'Campaign not found', 404);
      return {
        ...c,
        eligible: (await s.campaignAudience(c.data)).length,
        delivery: 0,
        redemptions: 0,
        attributedSales: 0,
        discountCost: 0,
        repeatVisits: 0,
        notice: 'Demo metrics. Attributed sales are not proven additional revenue.',
      };
    },
    manager,
  );
  route(
    'post',
    '/api/manager/campaigns/:id/launch',
    (req) => s.launchCampaign(req.params.id, req.user),
    manager,
  );
  route(
    'post',
    '/api/manager/campaigns/:id/pause',
    async (req) => {
      await s.db.query("UPDATE campaigns SET status='paused' WHERE id=$1", [req.params.id]);
      await s.audit(req.user.id, 'campaign.paused', req.params.id);
    },
    manager,
  );
  route(
    'get',
    '/api/manager/catalogue',
    async () => ({
      events: (await s.db.query('SELECT data FROM events')).rows.map((r) => r.data),
      offers: (await s.db.query('SELECT data FROM offers')).rows.map((r) => r.data),
      challenges:
        (await s.one('SELECT data FROM settings WHERE id=$1', ['challenges']))?.data || [],
      validations: (
        await s.db.query('SELECT * FROM validations ORDER BY created_at DESC LIMIT 100')
      ).rows,
      visits: (await s.db.query('SELECT * FROM visits ORDER BY created_at DESC LIMIT 100')).rows,
    }),
    manager,
  );
  route(
    'put',
    '/api/manager/events/:id',
    async (req) => {
      const d = z
        .object({
          id: z.string(),
          title: z.string().min(1).max(100),
          genre: z.enum(['Blues', 'DJ', 'Acoustic']),
          date: z.string().datetime(),
          description: z.string().max(500),
          sample: z.literal(true),
          free: z.literal(true),
        })
        .strict()
        .parse(req.body);
      demand(d.id === req.params.id, 'Identifier mismatch');
      await s.db.query('INSERT INTO events VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2', [
        d.id,
        d,
      ]);
      await s.audit(req.user.id, 'event.saved', d.id);
      return d;
    },
    manager,
  );
  route(
    'put',
    '/api/manager/offers/:id',
    async (req) => {
      const d = z
        .object({
          id: z.string(),
          name: z.string().min(1).max(100),
          description: z.string().max(300),
          discount: z.number().int().min(1).max(5000),
          min: z.number().int().min(100).max(100000),
          points: z.number().int().min(0).max(10000),
          expires: z.string().datetime(),
          sample: z.literal(true),
        })
        .strict()
        .parse(req.body);
      demand(d.id === req.params.id && d.discount <= d.min, 'Invalid offer limits');
      await s.db.query('INSERT INTO offers VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2', [
        d.id,
        d,
      ]);
      await s.audit(req.user.id, 'offer.saved', d.id);
      return d;
    },
    manager,
  );
  route(
    'put',
    '/api/manager/challenges',
    async (req) => {
      const d = z
        .array(
          z
            .object({
              id: z.string().min(1),
              name: z.string().min(1).max(100),
              description: z.string().max(300),
              target: z.number().int().min(1).max(20),
              kind: z.enum(['visit', 'food', 'music', 'quiz', 'festival', 'history']),
              icon: z.string().max(5),
            })
            .strict(),
        )
        .min(1)
        .max(20)
        .parse(req.body);
      demand(new Set(d.map((c) => c.id)).size === d.length, 'Duplicate challenge identifiers');
      await s.db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2', [
        'challenges',
        d,
      ]);
      await s.audit(req.user.id, 'challenges.configured', 'definitions');
    },
    manager,
  );
  route(
    'post',
    '/api/manager/reverse-validation',
    async (req) => {
      const d = z
        .object({ id: z.string(), type: z.enum(['visit', 'validation']) })
        .strict()
        .parse(req.body);
      await s.db.transaction(async (db) => {
        await db.query(`DELETE FROM ${d.type === 'visit' ? 'visits' : 'validations'} WHERE id=$1`, [
          d.id,
        ]);
        await s.audit(req.user.id, 'verification.reversed', d.id, db);
      });
    },
    manager,
  );
  route(
    'post',
    '/api/manager/loyalty-adjustment',
    async (req) => {
      const d = z
        .object({
          userId: z.string(),
          points: z.number().int().min(-10000).max(10000),
          reason: z.string().min(5).max(150),
        })
        .strict()
        .parse(req.body);
      await s.db.transaction(async (db) => {
        await db.query('INSERT INTO loyalty(id,user_id,points,reason) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          d.userId,
          d.points,
          'manager: ' + d.reason,
        ]);
        await s.audit(req.user.id, 'loyalty.adjusted', d.userId, db);
      });
    },
    manager,
  );
  route(
    'get',
    '/api/manager/audit',
    async () => (await s.db.query('SELECT * FROM audit ORDER BY created_at DESC LIMIT 100')).rows,
    manager,
  );
  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof z.ZodError)
      return res
        .status(400)
        .json({ error: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    if (err instanceof Fault) return res.status(err.status).json({ error: err.message });
    if (err.code === '23505')
      return res.status(409).json({ error: 'This action has already been recorded' });
    if (err.code === '23503') return res.status(400).json({ error: 'Referenced record not found' });
    console.error('Request failed:', err.constructor.name);
    res.status(500).json({ error: 'Something went wrong. Please try again or ask the team.' });
  });
  return app;
}
