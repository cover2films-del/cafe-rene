import { randomUUID } from 'node:crypto';
import type { DB } from './db.ts';
import { venueDay } from '../../../packages/shared/src/index.ts';
import { demand } from './service.ts';
export async function printCheckin(db: DB) {
  await db.query(
    "INSERT INTO settings VALUES('print-checkin','{\"version\":1}') ON CONFLICT DO NOTHING",
  );
  const version = (await db.query("SELECT data FROM settings WHERE id='print-checkin'")).rows[0]
    .data.version;
  return {
    code: 'rene-gloucester-v' + version,
    url: 'https://cafe-rene.onrender.com/?checkin=rene-gloucester-v' + version,
  };
}
export async function visitJournal(db: DB, userId: string) {
  const visits = (
    await db.query(
      'SELECT id,day,method,created_at FROM visit_journal WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [userId],
    )
  ).rows;
  return { checkedInToday: visits.some((v) => v.day === venueDay()), visits };
}
export async function recordPrintedVisit(db: DB, userId: string, code: string) {
  const current = await printCheckin(db);
  demand(
    current.code === code,
    'This check-in code has been replaced. Ask the team for the current QR.',
    410,
  );
  const result = await db.query(
    "INSERT INTO visit_journal(id,user_id,day,method) VALUES($1,$2,$3,'printed_qr') ON CONFLICT DO NOTHING RETURNING id",
    [randomUUID(), userId, venueDay()],
  );
  return {
    ...(await visitJournal(db, userId)),
    alreadyRecorded: !result.rows.length,
    message: result.rows.length
      ? 'Your visit is recorded. Enjoy René!'
      : 'You’re already checked in today.',
  };
}
