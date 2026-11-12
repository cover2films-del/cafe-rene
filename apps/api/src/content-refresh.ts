import type { DB } from './db.ts';
import { refreshWebsite } from './venue-content.ts';
import { refreshSocial, socialStatus } from './social.ts';
export async function refreshContent(db: DB, force = false, request: typeof fetch = fetch) {
  const now = Date.now();
  const interval =
    Math.min(60, Math.max(5, Number(process.env.CONTENT_REFRESH_MINUTES) || 15)) * 60000;
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT DO NOTHING', [
    'content-refresh',
    { nextAt: 0, leaseUntil: 0 },
  ]);
  const claimed = await db.query(
    "UPDATE settings SET data=jsonb_set(data,'{leaseUntil}',to_jsonb($1::bigint)) WHERE id='content-refresh' AND COALESCE((data->>'leaseUntil')::bigint,0)<=$2 AND ($3::boolean OR COALESCE((data->>'nextAt')::bigint,0)<=$2) RETURNING data",
    [now + 600000, now, force],
  );
  if (!claimed.rows.length) return { skipped: true };
  const errors: string[] = [];
  let website: any = null,
    social: any = null;
  try {
    try {
      website = await refreshWebsite(db, request);
    } catch {
      errors.push('Official website unavailable; keeping the last successful artwork.');
    }
    const connected = socialStatus();
    if ((connected.facebook || connected.instagram) && connected.version) {
      try {
        social = await refreshSocial(db, 'scheduled-content', request, {
          autoPublish: process.env.SOCIAL_AUTO_PUBLISH !== 'false',
        });
        errors.push(...social.errors);
      } catch {
        errors.push('Social refresh unavailable; keeping existing posts.');
      }
    }
    const result = {
      skipped: false,
      checkedAt: new Date().toISOString(),
      nextAt: Date.now() + (errors.length ? Math.min(interval, 300000) : interval),
      leaseUntil: 0,
      website,
      social,
      errors,
    };
    await db.query('UPDATE settings SET data=$1 WHERE id=$2', [result, 'content-refresh']);
    return result;
  } catch (e) {
    await db.query('UPDATE settings SET data=$1 WHERE id=$2', [
      { nextAt: Date.now() + 300000, leaseUntil: 0, errors: ['Content refresh deferred'] },
      'content-refresh',
    ]);
    throw e;
  }
}
