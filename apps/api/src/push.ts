import { createHash, randomUUID } from 'node:crypto';
import type { DB } from './db.ts';
export const pushCategories = ['messages', 'deals', 'rewards', 'gigs', 'events'] as const;
export type PushCategory = (typeof pushCategories)[number];
export const deviceId = (token: string) => createHash('sha256').update(token).digest('hex');
export async function enqueuePush(
  db: DB,
  key: string,
  category: PushCategory,
  title: string,
  body: string,
  data: object,
  userIds?: string[],
) {
  if (userIds && !userIds.length) return;
  const devices = (
    await db.query(
      "SELECT d.id,d.user_id FROM push_devices d JOIN users u ON u.id=d.user_id WHERE d.active=true AND u.deleted=false AND d.preferences->>$1='true' AND ($1<>'deals' OR u.preferences->>'push'='true')",
      [category],
    )
  ).rows;
  for (const device of devices)
    if (!userIds || userIds.includes(device.user_id))
      await db.query(
        'INSERT INTO push_deliveries(id,device_id,user_id,event_key,category,title,body,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING',
        [
          randomUUID(),
          device.id,
          device.user_id,
          key,
          category,
          title.slice(0, 80),
          body.slice(0, 160),
          data,
        ],
      );
}
export async function deliverPush(db: DB, request: typeof fetch = fetch) {
  if (process.env.PUSH_DELIVERY_ENABLED === 'false') return { disabled: true, sent: 0 };
  const now = Date.now();
  const deliveries = await db.transaction(async (tx) => {
    const rows = (
      await tx.query(
        "SELECT p.*,d.token FROM push_deliveries p JOIN push_devices d ON d.id=p.device_id JOIN users u ON u.id=p.user_id WHERE p.status IN ('queued','retry') AND p.next_at<=$1 AND p.attempts<5 AND d.active=true AND d.user_id=p.user_id AND u.deleted=false AND (p.category<>'messages' OR NOT (p.data ? 'circleId') OR EXISTS(SELECT 1 FROM circle_members cm WHERE cm.circle_id=p.data->>'circleId' AND cm.user_id=p.user_id AND cm.status='active')) AND d.preferences->>p.category='true' AND (p.category<>'deals' OR u.preferences->>'push'='true') ORDER BY p.created_at LIMIT 50 FOR UPDATE OF p SKIP LOCKED",
        [now],
      )
    ).rows;
    for (const row of rows)
      await tx.query(
        "UPDATE push_deliveries SET status='sending',attempts=attempts+1,next_at=$1 WHERE id=$2",
        [now + 120000, row.id],
      );
    return rows;
  });
  let sent = 0;
  if (deliveries.length) {
    try {
      const response = await request('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EXPO_PUSH_ACCESS_TOKEN
            ? { Authorization: 'Bearer ' + process.env.EXPO_PUSH_ACCESS_TOKEN }
            : {}),
        },
        body: JSON.stringify(
          deliveries.map((d) => ({
            to: d.token,
            title: d.title,
            body: d.body,
            data: d.data,
            sound: 'default',
          })),
        ),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw Error('Push service unavailable');
      const result = (await response.json()) as any;
      for (let i = 0; i < deliveries.length; i++) {
        const ticket = result.data?.[i],
          row = deliveries[i];
        if (ticket?.status === 'ok' && ticket.id) {
          await db.query(
            "UPDATE push_deliveries SET status='receipt_pending',ticket_id=$1,next_at=$2 WHERE id=$3",
            [ticket.id, Date.now() + 60000, row.id],
          );
          sent++;
        } else {
          const invalid = ticket?.details?.error === 'DeviceNotRegistered';
          if (invalid)
            await db.query('UPDATE push_devices SET active=false WHERE id=$1', [row.device_id]);
          await db.query('UPDATE push_deliveries SET status=$1,next_at=$2 WHERE id=$3', [
            invalid ? 'failed' : 'retry',
            Date.now() + 60000,
            row.id,
          ]);
        }
      }
    } catch {
      for (const row of deliveries)
        await db.query("UPDATE push_deliveries SET status='failed' WHERE id=$1", [row.id]);
    }
  }
  // A ticket is not delivery confirmation: process receipts and retire invalid tokens.
  const pending = (
    await db.query(
      "SELECT id,device_id,ticket_id FROM push_deliveries WHERE status='receipt_pending' AND next_at<=$1 LIMIT 100",
      [Date.now()],
    )
  ).rows;
  if (pending.length)
    try {
      const response = await request('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.EXPO_PUSH_ACCESS_TOKEN
            ? { Authorization: 'Bearer ' + process.env.EXPO_PUSH_ACCESS_TOKEN }
            : {}),
        },
        body: JSON.stringify({ ids: pending.map((p) => p.ticket_id) }),
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        const result = (await response.json()) as any;
        for (const row of pending) {
          const receipt = result.data?.[row.ticket_id];
          if (!receipt) continue;
          await db.query('UPDATE push_deliveries SET status=$1 WHERE id=$2', [
            receipt.status === 'ok' ? 'sent' : 'failed',
            row.id,
          ]);
          if (receipt.details?.error === 'DeviceNotRegistered')
            await db.query('UPDATE push_devices SET active=false WHERE id=$1', [row.device_id]);
        }
      }
    } catch {
      /* receipt lookup retries next tick */
    }
  // A crashed sender has an ambiguous outcome; do not resend it and risk duplicates.
  await db.query(
    "UPDATE push_deliveries SET status='failed' WHERE status='sending' AND next_at<$1",
    [Date.now()],
  );
  return { sent };
}
