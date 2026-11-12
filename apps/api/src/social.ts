import { enqueuePush } from './push.ts';
import { cacheImage } from './venue-content.ts';
import { createHash } from 'node:crypto';
import type { DB } from './db.ts';
import { randomUUID } from 'node:crypto';
import { demand } from './service.ts';
type Channel = 'facebook' | 'instagram';
export function socialStatus() {
  return {
    facebook: !!(process.env.META_PAGE_ID && process.env.META_PAGE_ACCESS_TOKEN),
    instagram: !!(process.env.META_INSTAGRAM_ACCOUNT_ID && process.env.META_INSTAGRAM_ACCESS_TOKEN),
    version: process.env.META_GRAPH_VERSION || null,
    automaticPublication: process.env.SOCIAL_AUTO_PUBLISH !== 'false',
    policy:
      'Read-only venue posts → manager review → event publication. No comments, messages or customer profiles.',
  };
}
export async function refreshSocial(
  db: DB,
  actor: string,
  request: typeof fetch = fetch,
  options: { autoPublish?: boolean } = {},
) {
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
      let imagesChecked = 0;
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
        const autoPublished = options.autoPublish === true;
        const imageSourceUrl =
          post.full_picture ?? (post.media_type === 'IMAGE' ? post.media_url : null);
        let cachedImageUrl: string | null = null,
          cachedImageId: string | null = null;
        if (autoPublished && typeof imageSourceUrl === 'string' && imagesChecked++ < 3) {
          try {
            const imageId =
              'social-' +
              createHash('sha256')
                .update(channel.channel + post.id)
                .digest('hex')
                .slice(0, 24);
            const asset = await cacheImage(db, imageId, imageSourceUrl, 'social', request);
            cachedImageUrl = asset.url;
            cachedImageId = asset.id;
          } catch {
            /* Keep the text/link if provider media is unavailable or unapproved. */
          }
        }
        const row = await db.query(
          `INSERT INTO content(id,data,status) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET data=$2,status=$3 WHERE $4::boolean AND (content.status='needs_review' OR (content.status='approved' AND content.data->>'autoPublished'='true' AND (content.data->>'text' IS DISTINCT FROM $2::jsonb->>'text' OR content.data->>'imageSourceUrl' IS DISTINCT FROM $2::jsonb->>'imageSourceUrl' OR content.data->>'cachedImageUrl' IS DISTINCT FROM $2::jsonb->>'cachedImageUrl'))) RETURNING id`,
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
              permission: autoPublished ? 'venue_account_reuse_requested_by_user' : 'unknown',
              autoPublished,
              cachedImageUrl,
              cachedImageId,
              confidence: 'authorised_venue_account',
              imageSourceUrl:
                post.full_picture ?? (post.media_type === 'IMAGE' ? post.media_url : null),
              issues: [
                'Event date and image reuse require manager review; post timestamp is not the event date.',
              ],
            },
            autoPublished ? 'approved' : 'needs_review',
            autoPublished,
          ],
        );
        imported += row.rows.length;
        if (
          autoPublished &&
          row.rows.length &&
          Date.parse(post.created_time ?? post.timestamp) >= Date.now() - 86400000 &&
          Date.parse(post.created_time ?? post.timestamp) <= Date.now() + 300000
        )
          await enqueuePush(
            db,
            'social:' + channel.channel + ':' + post.id,
            /\b(gig|live music|band|dj|concert)\b/i.test(text)
              ? 'gigs'
              : /\b(deal|offer|discount)\b/i.test(text)
                ? 'deals'
                : 'events',
            'New from Café René',
            'There is a new venue update.',
            { screen: 'What’s On' },
          );
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
    message: options.autoPublish
      ? 'Venue posts refreshed. Event dates still require review.'
      : 'Posts saved to content review. No events published automatically.',
  };
}
