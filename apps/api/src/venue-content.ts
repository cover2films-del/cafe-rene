import { enqueuePush } from './push.ts';
import { load } from 'cheerio';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import type { DB } from './db.ts';
export const websiteOrigin = 'https://www.caferene.co.uk';
export const websiteEvents = websiteOrigin + '/events32897205y0w609734';
const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export async function boundedResponse(response: Response, maxBytes: number) {
  if (!response.ok || !response.body) throw Error('Source unavailable');
  if (Number(response.headers.get('content-length')) > maxBytes) throw Error('Source too large');
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw Error('Source too large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return Buffer.concat(chunks);
}
export function discoverVenueImages(html: string) {
  const $ = load(html, { scriptingEnabled: false }),
    images: { url: string; logo: boolean; period: string | null }[] = [];
  $('img').each((_i, node) => {
    const el = $(node);
    for (const attr of ['data-src', 'data-original', 'src']) {
      const raw = el.attr(attr);
      if (!raw || raw.startsWith('data:')) continue;
      let url: URL;
      try {
        url = new URL(raw, websiteOrigin);
      } catch {
        continue;
      }
      if (
        url.origin !== websiteOrigin ||
        !url.pathname.startsWith('/uploads/') ||
        !/\.(?:png|jpe?g|webp)$/i.test(url.pathname)
      )
        continue;
      const logo = /logo/i.test(url.pathname + ' ' + el.attr('alt'));
      if (!logo && /icon|spacer|pixel/i.test(url.pathname)) continue;
      const month = url.pathname.match(
        /(?:LiveMusic|calendar|programme).*?(\d{2})[-_](\d{1,2})[-_]/i,
      );
      images.push({
        url: url.href,
        logo,
        period: month ? `20${month[1]}-${month[2].padStart(2, '0')}` : null,
      });
      break;
    }
  });
  return images.filter((x, i, a) => a.findIndex((y) => y.url === x.url) === i).slice(0, 8);
}
export function allowedSocialImage(url: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      !u.port &&
      !u.username &&
      !u.password &&
      ['.fbcdn.net', '.cdninstagram.com', '.fbsbx.com'].some((s) => u.hostname.endsWith(s))
    );
  } catch {
    return false;
  }
}
export async function cacheImage(
  db: DB,
  id: string,
  url: string,
  kind: string,
  request: typeof fetch = fetch,
) {
  const u = new URL(url);
  if (
    kind === 'social'
      ? !allowedSocialImage(url)
      : u.origin !== websiteOrigin || !u.pathname.startsWith('/uploads/')
  )
    throw Error('Unapproved image source');
  const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(12000) });
  const input = await boundedResponse(response, 4_000_000);
  const img = sharp(input, { limitInputPixels: 24_000_000, failOn: 'error' });
  const meta = await img.metadata();
  if (!['png', 'jpeg', 'webp'].includes(meta.format || '')) throw Error('Unsupported image');
  if (!meta.width || !meta.height || meta.width < 20 || meta.height < 20)
    throw Error('Image too small');
  const bytes = await img
    .rotate()
    .resize({
      width: kind === 'logo' ? 640 : 1400,
      height: kind === 'logo' ? 400 : 2200,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 84 })
    .toBuffer();
  await db.query(
    'INSERT INTO venue_assets(id,source_url,kind,content_type,bytes,checksum) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET source_url=$2,bytes=$5,checksum=$6,updated_at=now()',
    [id, url, kind, 'image/webp', bytes, digest(bytes)],
  );
  return {
    id,
    url: '/api/venue-assets/' + id + '?v=' + digest(bytes).slice(0, 16),
    width: meta.width,
    height: meta.height,
  };
}
export async function refreshWebsite(db: DB, request: typeof fetch = fetch) {
  const response = await request(websiteEvents, {
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  const html = (await boundedResponse(response, 1_500_000)).toString('utf8');
  const found = discoverVenueImages(html);
  if (!found.some((x) => !x.logo)) throw Error('No programme graphics found');
  const previous = (await db.query('SELECT data FROM settings WHERE id=$1', ['website-content']))
    .rows[0]?.data;
  const programmes: any[] = [];
  let logo = previous?.logo || null;
  const errors: string[] = [];
  for (const source of found) {
    const id = (source.logo ? 'logo-' : 'programme-') + digest(source.url).slice(0, 20);
    try {
      const asset = await cacheImage(
        db,
        id,
        source.url,
        source.logo ? 'logo' : 'programme',
        request,
      );
      if (source.logo) logo = asset;
      else programmes.push({ ...asset, period: source.period, sourceUrl: websiteEvents });
    } catch {
      errors.push(source.logo ? 'Logo refresh unavailable' : 'One programme image unavailable');
    }
  }
  if (!programmes.length) throw Error('Programme graphics unavailable');
  let menus = previous?.menus || [];
  try {
    menus = await (await import('./menu-links.ts')).discoverMenuLinks(request);
  } catch {
    errors.push('Menu links refresh unavailable; keeping previous links.');
  }
  const checkedAt = new Date().toISOString();
  const data = {
    checkedAt,
    lastSuccessAt: checkedAt,
    sourceUrl: websiteEvents,
    menus,
    logo,
    programmes,
    errors,
  };
  await db.query('INSERT INTO settings VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2', [
    'website-content',
    data,
  ]);
  for (const p of programmes)
    await db.query('INSERT INTO content(id,data,status) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [
      'website-' + p.id,
      {
        title: 'Official website programme graphic',
        url: websiteEvents,
        text: 'New venue artwork detected. Review exact event dates before adding structured listings.',
        type: 'website-programme',
        imageUrl: p.url,
        retrievedAt: checkedAt,
        permission: 'requested_by_venue_user',
        confidence: 'official_website',
        publicationDate: p.period,
      },
      'needs_review',
    ]);
  if (programmes.some((p) => !previous?.programmes?.some((old: any) => old.url === p.url)))
    await enqueuePush(
      db,
      'programme:' + programmes.map((p) => p.url).join('|'),
      'events',
      'New René programme',
      'See the latest programme from the venue.',
      { screen: 'What’s On' },
    );
  return { programmes: programmes.length, errors };
}
export async function publicVenueContent(db: DB) {
  const state = (await db.query('SELECT data FROM settings WHERE id=$1', ['website-content']))
    .rows[0]?.data;
  const posts = (
    await db.query(
      "SELECT id,data FROM content WHERE status='approved' AND data->>'type'='social' ORDER BY COALESCE(data->>'publicationDate','') DESC LIMIT 12",
    )
  ).rows.map((r) => ({
    id: r.id,
    platform: r.data.platform,
    text: r.data.text.slice(0, 1600),
    url: r.data.url,
    date: r.data.publicationDate,
    imageUrl: r.data.cachedImageUrl || null,
  }));
  const month = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);
  return {
    logo: state?.logo || { url: '/brand/logo.png' },
    checkedAt: state?.checkedAt || null,
    stale: !state || Date.now() - new Date(state.lastSuccessAt).getTime() > 864e5,
    programmes: (
      state?.programmes || [
        {
          id: 'fallback-nov26',
          url: '/programme/november-2026.webp',
          period: '2026-11',
          sourceUrl: websiteEvents,
        },
      ]
    ).filter((p: any) => !p.period || p.period >= month),
    posts,
    menus: state?.menus || [],
    refreshMinutes: Number(process.env.CONTENT_REFRESH_MINUTES) || 15,
  };
}
