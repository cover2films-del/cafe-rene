import { load } from 'cheerio';
import { boundedResponse, websiteOrigin } from './venue-content.ts';
export async function discoverMenuLinks(request: typeof fetch = fetch) {
  const response = await request(websiteOrigin + '/restaurant', {
    redirect: 'error',
    signal: AbortSignal.timeout(12000),
  });
  const html = (await boundedResponse(response, 1_500_000)).toString('utf8');
  const $ = load(html, { scriptingEnabled: false });
  const links: { title: string; url: string }[] = [];
  $('a[href]').each((_i, el) => {
    const title = $(el).text().trim().slice(0, 100);
    try {
      const url = new URL($(el).attr('href')!, websiteOrigin);
      if (
        url.origin === websiteOrigin &&
        url.pathname.startsWith('/uploads/') &&
        /\.(pdf|png|jpe?g|webp)$/i.test(url.pathname) &&
        /menu|drinks?|beer|cocktail/i.test(title) &&
        !/booking form/i.test(title)
      )
        links.push({ title, url: url.href });
    } catch {
      /* ignore invalid links */
    }
  });
  return links.filter((l, i, a) => a.findIndex((x) => x.url === l.url) === i).slice(0, 16);
}
