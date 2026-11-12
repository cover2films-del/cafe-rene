const normalise = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
export function eventArtwork(events: any[], posts: any[]) {
  const matches = new Map<string, string>();
  for (const post of posts) {
    if (!post.imageUrl) continue;
    const text = ' ' + normalise(post.text || '') + ' ';
    const linked = events.filter(
      (e) =>
        !e.sample &&
        normalise(e.title).length >= 5 &&
        text.includes(' ' + normalise(e.title) + ' '),
    );
    if (linked.length === 1 && !matches.has(linked[0].id)) matches.set(linked[0].id, post.imageUrl);
  }
  return events.map((e) => ({
    ...e,
    ...(!e.artistImageUrl && matches.has(e.id) ? { artistImageUrl: matches.get(e.id) } : {}),
  }));
}
