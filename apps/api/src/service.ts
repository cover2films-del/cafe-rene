import { enqueuePush } from './push.ts';
import { randomUUID, randomBytes, createHash, scryptSync } from 'node:crypto';
import { z } from 'zod';
import type { DB } from './db.ts';
import { MockPayment, MockPOS, sign, equal } from './adapters.ts';
import { hashPassword } from './seed.ts';
import { challenges, venueDay, type MenuItem } from '../../../packages/shared/src/index.ts';
export class Fault extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const demand = (ok: unknown, message: string, status = 400) => {
  if (!ok) throw new Fault(status, message);
};
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const uid = () => randomUUID();
const basketSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            itemId: z.string(),
            quantity: z.number().int().min(1).max(20),
            modifierIds: z.array(z.string()).max(6),
          })
          .strict(),
      )
      .min(1)
      .max(30),
    tableRef: z.string().optional(),
    collection: z.boolean().default(false),
    notes: z.string().max(500).default(''),
    offerId: z.string().optional(),
    requestKey: z.string().uuid(),
  })
  .strict();
export class Service {
  payment: MockPayment;
  pos = new MockPOS();
  secret: string;
  webhookSecret: string;
  constructor(
    public db: DB,
    options: { secret: string; webhookSecret: string; mode?: string },
  ) {
    demand(
      (options.mode || 'demo') === 'demo',
      'Live mode is disabled until real adapters and approval are configured',
      503,
    );
    this.secret = options.secret;
    this.webhookSecret = options.webhookSecret;
    this.payment = new MockPayment(options.webhookSecret);
  }
  async one(sql: string, p: any[] = []) {
    return (await this.db.query(sql, p)).rows[0];
  }
  async settings() {
    return (await this.one('SELECT data FROM settings WHERE id=$1', ['ordering'])).data;
  }
  async audit(actor: string, action: string, reference: string, db = this.db) {
    await db.query('INSERT INTO audit(id,actor,action,reference) VALUES($1,$2,$3,$4)', [
      uid(),
      actor,
      action,
      reference,
    ]);
  }
  async login(email: string, password: string) {
    const u = await this.one('SELECT * FROM users WHERE email=$1 AND deleted=false', [email]);
    demand(u, 'Invalid credentials', 401);
    const [salt, hash] = u.password.split(':');
    demand(equal(scryptSync(password, salt, 64).toString('hex'), hash), 'Invalid credentials', 401);
    const token = randomBytes(32).toString('hex');
    await this.db.query('INSERT INTO sessions VALUES($1,$2,$3)', [
      digest(token),
      u.id,
      Date.now() + 7 * 864e5,
    ]);
    return { token, user: this.publicUser(u) };
  }
  publicUser(u: any) {
    return { id: u.id, name: u.name, role: u.role, preferences: u.preferences };
  }
  async auth(token: string) {
    const row = await this.one(
      'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1 AND s.expires_at>$2 AND u.deleted=false',
      [digest(token), Date.now()],
    );
    demand(row, 'Sign in required', 401);
    return this.publicUser(row);
  }
  role(user: any, roles: string[]) {
    demand(user && roles.includes(user.role), 'Permission denied', 403);
  }
  reference(kind: string, id: string, version = 1, seconds = 3600) {
    const p = Buffer.from(
      JSON.stringify({ kind, id, version, exp: Date.now() + seconds * 1000 }),
    ).toString('base64url');
    return p + '.' + sign(p, this.secret);
  }
  verify(ref: string, kind: string) {
    const [p, s] = ref.split('.');
    demand(p && s && equal(sign(p, this.secret), s), 'Invalid QR reference');
    let v: any;
    try {
      v = JSON.parse(Buffer.from(p, 'base64url').toString());
    } catch {
      throw new Fault(400, 'Invalid QR reference');
    }
    demand(v.kind === kind && v.exp > Date.now(), 'QR expired or invalid');
    return v;
  }
  async table(ref: string) {
    const v = this.verify(ref, 'table');
    const t = await this.one('SELECT * FROM tables WHERE id=$1 AND enabled=true', [v.id]);
    demand(t && t.version === v.version, 'Table unavailable or QR revoked');
    return t;
  }
  async menu() {
    return (await this.db.query('SELECT data FROM menu ORDER BY id')).rows.map(
      (r) => r.data as MenuItem,
    );
  }
  async foodStamps(userId: string, db = this.db) {
    return Number(
      (
        await db.query(
          "SELECT count(DISTINCT (o.created_at AT TIME ZONE 'Europe/London')::date) AS n FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN menu m ON m.id=oi.item_id WHERE o.user_id=$1 AND o.payment='paid' AND o.status='completed' AND m.data->>'category'<>'Drinks' AND (m.data->>'alcohol')::boolean=false",
          [userId],
        )
      ).rows[0].n,
    );
  }
  async points(userId: string, db = this.db) {
    return Number(
      (
        await db.query('SELECT COALESCE(sum(points),0) AS n FROM loyalty WHERE user_id=$1', [
          userId,
        ])
      ).rows[0].n,
    );
  }
  async checkout(input: unknown, user: any) {
    const b = basketSchema.parse(input);
    const settings = await this.settings();
    demand(settings.open, 'Ordering is currently paused');
    if (settings.enforceHours) {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        weekday: 'short',
        hour: 'numeric',
        hourCycle: 'h23',
      }).formatToParts(now);
      const hour = Number(parts.find((p) => p.type === 'hour')?.value);
      const sunday = parts.find((p) => p.type === 'weekday')?.value === 'Sun';
      demand(hour >= 11 && hour < (sunday ? 17 : 20), 'Kitchen is closed');
    }
    demand(!b.collection || settings.collection, 'Collection is unavailable');
    const table = b.collection ? null : await this.table(b.tableRef || '');
    const menu = await this.menu();
    let total = 0;
    let foodTotal = 0;
    let alcohol = false;
    const lines = b.items.map((l) => {
      const item = menu.find((m) => m.id === l.itemId);
      demand(item && item.available, 'An item is unavailable');
      const i = item!;
      demand(new Set(l.modifierIds).size === l.modifierIds.length, 'Duplicate modifier');
      const mods = l.modifierIds.map((id) => {
        const m = i.modifiers.find((m) => m.id === id);
        demand(m, 'Invalid modifier');
        return m!;
      });
      const price = i.price + mods.reduce((s, m) => s + m.price, 0);
      total += price * l.quantity;
      if (i.category !== 'Drinks' && !i.alcohol) foodTotal += price * l.quantity;
      alcohol ||= i.alcohol;
      return { ...l, name: i.name, price, mods };
    });
    const guestSecret = randomBytes(32).toString('hex');
    const id = uid();
    let discount = 0;
    return this.db.transaction(async (db) => {
      const prior = (await db.query('SELECT * FROM orders WHERE request_key=$1', [b.requestKey]))
        .rows[0];
      if (prior) {
        demand(
          user && prior.user_id === user.id,
          'Request already used; recover using your saved receipt reference',
          409,
        );
        return { order: prior, guestSecret: null, paymentSession: `mock_${prior.id}` };
      }
      if (b.offerId) {
        demand(user, 'Sign in to redeem an offer', 401);
        const offer = (await db.query('SELECT data FROM offers WHERE id=$1', [b.offerId])).rows[0]
          ?.data;
        demand(offer && new Date(offer.expires).getTime() > Date.now(), 'Offer expired');
        demand(foodTotal >= offer.min && !alcohol, 'Offer requires an eligible food basket');
        demand(
          !(
            await db.query('SELECT id FROM redemptions WHERE user_id=$1 AND offer_id=$2', [
              user.id,
              b.offerId,
            ])
          ).rows.length,
          'Offer already used',
        );
        demand((await this.points(user.id, db)) >= offer.points, 'Not enough points');
        demand(
          !offer.stampsRequired || (await this.foodStamps(user.id, db)) >= offer.stampsRequired,
          'Collect the required food-visit stamps first',
        );
        discount = Math.min(foodTotal, offer.discount);
        await db.query('INSERT INTO redemptions(id,user_id,offer_id,status) VALUES($1,$2,$3,$4)', [
          uid(),
          user.id,
          b.offerId,
          'reserved',
        ]);
      }
      await db.query(
        'INSERT INTO orders(id,user_id,guest_hash,request_key,table_id,collection,total,discount,payment,status,notes,alcohol) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
        [
          id,
          user?.id || null,
          user ? null : digest(guestSecret),
          b.requestKey,
          table?.id || null,
          b.collection,
          total - discount,
          discount,
          'unpaid',
          'awaiting_payment',
          b.notes,
          alcohol,
        ],
      );
      for (const l of lines)
        await db.query('INSERT INTO order_items VALUES($1,$2,$3,$4,$5,$6,$7)', [
          uid(),
          id,
          l.itemId,
          l.name,
          l.quantity,
          l.price,
          l.mods,
        ]);
      const session = await this.payment.createSession(id, total - discount);
      await db.query('INSERT INTO payments VALUES($1,$2,$3,$4,$5)', [
        session.id,
        id,
        session.provider,
        total - discount,
        'unpaid',
      ]);
      if (b.offerId)
        await db.query('UPDATE redemptions SET order_id=$1 WHERE user_id=$2 AND offer_id=$3', [
          id,
          user.id,
          b.offerId,
        ]);
      await this.audit(user?.id || 'guest', 'order.created', id, db);
      return {
        order: (await db.query('SELECT * FROM orders WHERE id=$1', [id])).rows[0],
        guestSecret: user ? null : guestSecret,
        paymentSession: session.id,
      };
    });
  }
  async ownOrder(id: string, user: any, guestSecret?: string) {
    const o = await this.one('SELECT * FROM orders WHERE id=$1', [id]);
    demand(o, 'Order not found', 404);
    demand(
      (user && (o.user_id === user.id || ['staff', 'manager', 'admin'].includes(user.role))) ||
        (!o.user_id && guestSecret && equal(o.guest_hash || '', digest(guestSecret))),
      'Order access denied',
      403,
    );
    return o;
  }
  async order(id: string, user: any, guestSecret?: string) {
    const o = await this.ownOrder(id, user, guestSecret);
    const { guest_hash: _h, request_key: _k, ...safe } = o;
    return {
      ...safe,
      items: (await this.db.query('SELECT * FROM order_items WHERE order_id=$1', [id])).rows,
    };
  }
  async mockPay(id: string, user: any, guestSecret?: string) {
    const o = await this.ownOrder(id, user, guestSecret);
    demand(
      o.payment === 'unpaid' && o.status === 'awaiting_payment',
      'Payment cannot be completed',
      409,
    );
    const event = {
      id: `mock-paid-${id}`,
      orderId: id,
      amount: o.total,
      type: 'payment.succeeded',
    };
    const raw = Buffer.from(JSON.stringify(event));
    await this.webhook(raw, sign(raw.toString(), this.webhookSecret));
    return this.order(id, user, guestSecret);
  }
  async webhook(raw: Buffer, signature: string) {
    demand(this.payment.verify(raw, signature), 'Invalid webhook signature', 401);
    const e = z
      .object({
        id: z.string(),
        orderId: z.string(),
        amount: z.number().int(),
        type: z.literal('payment.succeeded'),
      })
      .parse(JSON.parse(raw.toString()));
    await this.db.transaction(async (db) => {
      const inserted = await db.query(
        'INSERT INTO payment_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',
        [e.id],
      );
      if (!inserted.rows.length) return;
      const o = (await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [e.orderId]))
        .rows[0];
      demand(o && o.total === e.amount, 'Payment amount mismatch');
      demand(o.status !== 'cancelled', 'Order was cancelled', 409);
      if (o.payment !== 'unpaid') return;
      await db.query('UPDATE orders SET payment=$1,status=$2 WHERE id=$3', [
        'paid',
        'awaiting_acceptance',
        o.id,
      ]);
      await db.query('UPDATE payments SET status=$1 WHERE order_id=$2', ['paid', o.id]);
      await db.query(
        'INSERT INTO jobs(id,order_id,status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [uid(), o.id, 'pending'],
      );
      await db.query('UPDATE redemptions SET status=$1 WHERE order_id=$2', ['redeemed', o.id]);
      if (o.user_id) {
        const offer = (
          await db.query(
            'SELECT f.data FROM offers f JOIN redemptions r ON r.offer_id=f.id WHERE r.order_id=$1',
            [o.id],
          )
        ).rows[0]?.data;
        if (offer?.points)
          await db.query('INSERT INTO loyalty VALUES($1,$2,$3,$4,$5,now())', [
            uid(),
            o.user_id,
            o.id,
            -offer.points,
            'redeem',
          ]);
      }
      await this.audit('payment-provider', 'payment.confirmed', o.id, db);
    });
  }
  async runJobs(force = false) {
    const jobs = (
      await this.db.query(
        "SELECT * FROM jobs WHERE status IN ('pending','failed') AND attempts<5 AND next_at<=$1",
        [force ? Number.MAX_SAFE_INTEGER : Date.now()],
      )
    ).rows;
    for (const j of jobs) {
      await this.db.transaction(async (db) => {
        const claim = (
          await db.query(
            "UPDATE jobs SET status='processing' WHERE id=$1 AND status IN ('pending','failed') RETURNING *",
            [j.id],
          )
        ).rows[0];
        if (!claim) return;
        const o = (await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [j.order_id]))
          .rows[0];
        if (o.payment !== 'paid' || o.status === 'cancelled') {
          await db.query("UPDATE jobs SET status='cancelled' WHERE id=$1", [j.id]);
          return;
        }
        try {
          const result = await this.pos.submit(
            {
              ...o,
              items: (await db.query('SELECT * FROM order_items WHERE order_id=$1', [o.id])).rows,
            },
            o.id,
          );
          await db.query('UPDATE orders SET pos_ref=$1 WHERE id=$2', [result.reference, o.id]);
          await db.query(
            "UPDATE jobs SET status='delivered',attempts=attempts+1,last_error=null WHERE id=$1",
            [j.id],
          );
          await db.query(
            'INSERT INTO pos_attempts(id,order_id,success,message) VALUES($1,$2,true,$3)',
            [uid(), o.id, result.reference],
          );
        } catch (e) {
          await db.query(
            "UPDATE jobs SET status='failed',attempts=attempts+1,next_at=$1,last_error=$2 WHERE id=$3",
            [Date.now() + Math.min(300000, 2 ** j.attempts * 5000), (e as Error).message, j.id],
          );
          await db.query(
            'INSERT INTO pos_attempts(id,order_id,success,message) VALUES($1,$2,false,$3)',
            [uid(), o.id, 'Mock delivery failed'],
          );
        }
      });
    }
    return jobs.length;
  }
  async progress(id: string, status: string, user: any, ageChecked = false) {
    this.role(user, ['staff', 'manager', 'admin']);
    await this.db.transaction(async (db) => {
      const o = (await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
      demand(o && o.payment === 'paid', 'Paid order required');
      const next: Record<string, string> = {
        awaiting_acceptance: 'accepted',
        accepted: 'preparing',
        preparing: 'ready',
        ready: 'completed',
      };
      demand(next[o.status] === status, 'Invalid order progression');
      demand(o.pos_ref, 'Resolve POS delivery before accepting');
      demand(!o.alcohol || o.age_checked || ageChecked, 'Staff age verification is required');
      await db.query('UPDATE orders SET status=$1,age_checked=$2 WHERE id=$3', [
        status,
        o.age_checked || ageChecked,
        id,
      ]);
      if (status === 'completed' && o.user_id) {
        const food = (
          await db.query(
            "SELECT oi.* FROM order_items oi JOIN menu m ON m.id=oi.item_id WHERE oi.order_id=$1 AND (m.data->>'alcohol')::boolean=false AND m.data->>'category'<>'Drinks'",
            [id],
          )
        ).rows;
        const points = Math.floor(
          food.reduce((s: any, i: any) => s + i.unit_price * i.quantity, 0) / 100,
        );
        await db.query(
          'INSERT INTO loyalty(id,user_id,order_id,points,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [uid(), o.user_id, id, Math.max(0, points - Math.ceil(o.discount / 100)), 'purchase'],
        );
        await db.query(
          'INSERT INTO visits(id,user_id,day,method) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [uid(), o.user_id, venueDay(), 'purchase:' + id],
        );
      }
      if (status === 'completed' && o.user_id)
        await enqueuePush(
          db,
          'reward:' + id,
          'rewards',
          'Your René rewards',
          'Your completed order has updated your rewards.',
          { screen: 'Rewards' },
          [o.user_id],
        );
      await this.audit(user.id, `order.${status}`, id, db);
    });
  }

  async refund(id: string, user: any) {
    this.role(user, ['manager', 'admin']);
    return this.db.transaction(async (db) => {
      const o = (await db.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE', [id])).rows[0];
      demand(o && o.payment === 'paid', 'Only paid orders can be refunded');
      await this.payment.refund(`mock_${id}`, o.total);
      await db.query("UPDATE orders SET payment='refunded',status='cancelled' WHERE id=$1", [id]);
      await db.query("UPDATE payments SET status='refunded' WHERE order_id=$1", [id]);
      await db.query("UPDATE jobs SET status='cancelled' WHERE order_id=$1", [id]);
      const earned = (
        await db.query('SELECT COALESCE(sum(points),0) AS n FROM loyalty WHERE order_id=$1', [id])
      ).rows[0].n;
      if (o.user_id && Number(earned) !== 0)
        await db.query(
          'INSERT INTO loyalty(id,user_id,order_id,points,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [uid(), o.user_id, id, -Number(earned), 'refund'],
        );
      await db.query("UPDATE redemptions SET status='reversed' WHERE order_id=$1", [id]);
      await db.query('DELETE FROM visits WHERE user_id=$1 AND method=$2', [
        o.user_id,
        'purchase:' + id,
      ]);
      await this.audit(user.id, 'order.refunded', id, db);
    });
  }
  async checkin(user: any, ref: string) {
    demand(user, 'Sign in to check in', 401);
    this.verify(ref, 'visit');
    const result = await this.db.query(
      'INSERT INTO visits(id,user_id,day,method) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id',
      [uid(), user.id, venueDay(), 'rotating_qr'],
    );
    demand(result.rows.length, 'Visit already verified today', 409);
    await this.audit(user.id, 'visit.verified', user.id);
    return this.rewards(user);
  }
  async rewards(user: any) {
    demand(user, 'Sign in to see your rewards', 401);
    const now = new Date();
    const cycleStart = venueDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
    const visits = (await this.db.query('SELECT * FROM visits WHERE user_id=$1 AND day >= $2', [user.id, cycleStart])).rows;
    const vals = (await this.db.query('SELECT * FROM validations WHERE user_id=$1', [user.id]))
      .rows;
    const foods = (
      await this.db.query(
        "SELECT DISTINCT oi.item_id FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN menu m ON m.id=oi.item_id WHERE o.user_id=$1 AND o.created_at >= $2 AND o.status='completed' AND o.payment='paid' AND (m.data->>'alcohol')::boolean=false AND m.data->>'category'<>'Drinks'",
        [user.id, cycleStart],
      )
    ).rows;
    const offers = (await this.db.query('SELECT data FROM offers')).rows.map((r) => r.data);
    const used = (await this.db.query('SELECT * FROM redemptions WHERE user_id=$1', [user.id]))
      .rows;
    const definitions =
      (await this.one('SELECT data FROM settings WHERE id=$1', ['challenges']))?.data || challenges;
    const challengeResults = definitions.map((c: any) => ({
      ...c,
      progress: Math.min(
        c.target,
        c.kind === 'visit'
          ? visits.length
          : c.kind === 'food'
            ? foods.length
            : vals.filter((v) => v.kind === c.kind && String(v.created_at || '').slice(0, 7) === cycleStart.slice(0, 7)).length,
      ),
      bonusPoints: 25 + Number(c.target || 1) * 10,
      cycle: cycleStart.slice(0, 7),
    }));
    await this.db.query('DELETE FROM loyalty WHERE user_id=$1 AND id LIKE $2', [
      user.id,
      `achievement-${user.id}-${cycleStart.slice(0, 7)}-%`,
    ]);
    for (const c of challengeResults)
      if (c.progress >= c.target)
        await this.db.query(
          'INSERT INTO loyalty(id,user_id,points,reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [`achievement-${user.id}-${c.cycle}-${c.id}`, user.id, c.bonusPoints, `achievement:${c.name}`],
        );
    const points = await this.points(user.id);
    const stamps = await this.foodStamps(user.id);
    return {
      points,
      pointsName: 'René Points',
      challengeCycle: cycleStart,
      challengeNote: 'Challenges refresh on the first of each month. Completed challenges award bonus René Points.',
      stampCard: {
        name: 'The Kitchen Club',
        stamps: Math.min(stamps, 6),
        target: 6,
        reward: '£5 off eligible food after six food-visit days',
        demo: true,
      },
      visits: visits.length,
      membership: this.reference('member', user.id, 1, 600),
      challenges: challengeResults,
      offers: offers.map((o) => ({
        ...o,
        eligible:
          !used.some((r) => r.offer_id === o.id) &&
          points >= o.points &&
          (!o.stampsRequired || stamps >= o.stampsRequired) &&
          new Date(o.expires).getTime() > Date.now(),
      })),
      history: (
        await this.db.query(
          'SELECT points,reason,created_at FROM loyalty WHERE user_id=$1 ORDER BY created_at DESC',
          [user.id],
        )
      ).rows,
      redemptions: used,
    };
  }
  async campaignAudience(data: any) {
    const users = (
      await this.db.query(
        "SELECT id,preferences FROM users WHERE role='customer' AND deleted=false",
      )
    ).rows;
    const eligible = users.filter(
      (u) =>
        u.preferences.personalisation &&
        u.preferences[data.channel || 'email'] &&
        (!data.interest || u.preferences.interests?.includes(data.interest)),
    );
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const recent = (
      await this.db.query(
        'SELECT user_id,count(*) AS n FROM campaign_deliveries WHERE created_at>$1 GROUP BY user_id',
        [since],
      )
    ).rows;
    return eligible
      .filter((u) => !recent.some((r) => r.user_id === u.id && Number(r.n) >= 2))
      .map((u) => u.id);
  }
  async launchCampaign(id: string, user: any) {
    this.role(user, ['manager', 'admin']);
    const c = await this.one('SELECT * FROM campaigns WHERE id=$1', [id]);
    demand(c && ['draft', 'paused'].includes(c.status), 'Campaign unavailable');
    demand(c.data.approved === true, 'Human preview approval required');
    const date = new Date(c.data.schedule);
    demand(!Number.isNaN(date.getTime()), 'Choose a schedule');
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(date),
    );
    demand(hour >= 9 && hour < 21, 'Quiet hours are 9pm–9am');
    const offer = (await this.one('SELECT data FROM offers WHERE id=$1', [c.data.offerId]))?.data;
    demand(offer && new Date(offer.expires).getTime() > Date.now(), 'Choose a current offer');
    const audience = await this.campaignAudience(c.data);
    demand(c.data.limit > 0 && c.data.budget >= 0, 'Set campaign limits');
    await this.db.query("UPDATE campaigns SET status='demo_scheduled' WHERE id=$1", [id]);
    await this.audit(user.id, 'campaign.demo_scheduled', id);
    return {
      eligible: audience.length,
      scheduled: Math.min(
        audience.length,
        c.data.limit,
        Math.floor(c.data.budget / offer.discount),
      ),
      sent: 0,
      message: 'Simulation only. No messages sent.',
    };
  }
  async register(input: unknown) {
    const d = z
      .object({
        email: z.email(),
        password: z.string().min(12).max(128),
        name: z.string().min(1).max(60),
      })
      .strict()
      .parse(input);
    demand(
      !(await this.one('SELECT id FROM users WHERE email=$1', [d.email])),
      'Account already exists',
      409,
    );
    await this.db.query(
      "INSERT INTO users(id,email,password,role,name) VALUES($1,$2,$3,'customer',$4)",
      [uid(), d.email, hashPassword(d.password), d.name],
    );
    return this.login(d.email, d.password);
  }
}
