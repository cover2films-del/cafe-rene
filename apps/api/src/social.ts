import type { DB } from './db.ts';
import { randomUUID } from 'node:crypto';
import { demand } from './service.ts';
type Channel = 'facebook' | 'instagram';
export function socialStatus() {
  return {
    facebook: !!(process.env.META_PAGE_ID && process.env.META_PAGE_ACCESS_TOKEN),
    instagram: !!(process.env.META_INSTAGRAM_ACCOUNT_ID && process.env.META_INSTAGRAM_ACCESS_TOKEN),
    version: process.env.META_GRAPH_VERSION || null,
    policy:
      'Read-only venue posts → manager review → event publication. No comments, messages or customer profiles.',
  };
}
export async function refreshSocial(db: DB, actor: string, request: typeof fetch = fetch) {
  const version = process.env.META_GRAPH_VERSION;
  demand(
    version && /^v\d+\.\d+$/.test(version),
    'Set META_GRAPH_VERSION to the version supported by your authorised Meta application.',
  );
  const channels: {
    channel: Channel;
    id: string | undefined;
    token: string | undefined;
    edge: string;
    fields: string;
  }[] = [
    {
      channel: 'facebook',
      id: process.env.META_PAGE_ID,
      token: process.env.META_PAGE_ACCESS_TOKEN,
      edge: 'posts',
      fields: 'id,message,created_time,permalink_url,full_picture',
    },
    {
      channel: 'instagram',
      id: process.env.META_INSTAGRAM_ACCOUNT_ID,
      token: process.env.META_INSTAGRAM_ACCESS_TOKEN,
      edge: 'media',
      fields: 'id,caption,media_type,media_url,permalink,timestamp',
    },
  ];
  const connected = channels.filter((c) => c.id && c.token);
  demand(
    connected.length,
    'No authorised social account is connected. Add Meta credentials in server environment settings.',
  );
  let imported = 0;
  const errors: string[] = [];
  for (const channel of connected) {
    if (!/^\d+$/.test(channel.id!)) {
      errors.push(channel.channel + ': invalid account ID');
      continue;
    }
    const endpoint = new URL(`https://graph.facebook.com/${version}/${channel.id}/${channel.edge}`);
    endpoint.searchParams.set('fields', channel.fields);
    endpoint.searchParams.set('limit', '20');
    try {
      const response = await request(endpoint, {
        headers: { Authorization: 'Bearer ' + channel.token },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        errors.push(
          `${channel.channel}: provider returned HTTP ${response.status}; check permissions/token`,
        );
        continue;
      }
      const result = await response.json();
      for (const post of Array.isArray(result.data) ? result.data : []) {
        if (typeof post.id !== 'string' || typeof (post.message ?? post.caption) !== 'string')
          continue;
        const text = String(post.message ?? post.caption).slice(0, 20000),
          url = post.permalink_url ?? post.permalink;
        if (
          typeof url !== 'string' ||
          !/^https:\/\/(?:www\.)?(facebook\.com|instagram\.com)\//.test(url)
        )
          continue;
        const row = await db.query(
          'INSERT INTO content(id,data,status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING id',
          [
            `social-${channel.channel}-${post.id}`,
            {
              title: text.slice(0, 100) || 'Venue social post',
              url,
              text,
              type: 'social',
              platform: channel.channel,
              publicationDate: post.created_time ?? post.timestamp,
              retrievedAt: new Date().toISOString(),
              permission: 'unknown',
              confidence: 'authorised_venue_account',
              imageSourceUrl:
                post.full_picture ?? (post.media_type === 'IMAGE' ? post.media_url : null),
              issues: [
                'Event date and image reuse require manager review; post timestamp is not the event date.',
              ],
            },
            'needs_review',
          ],
        );
        imported += row.rows.length;
      }
    } catch {
      errors.push(channel.channel + ': request unavailable; try later');
    }
  }
  await db.query('INSERT INTO audit(id,actor,action,reference) VALUES($1,$2,$3,$4)', [
    randomUUID(),
    actor,
    'social.refreshed',
    `Imported ${imported} venue posts`,
  ]);
  return {
    imported,
    errors,
    message: 'Posts saved to content review. No events published automatically.',
  };
}
