export async function artistPreview(query: string) {
  const q = query.trim().slice(0, 120);
  if (!q) return { available: false, reason: 'Artist name is required.' };
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) return { available: false, reason: 'Music preview is unavailable.' };
    const data = (await response.json()) as { data?: Array<any> };
    const track = data.data?.[0];
    if (!track?.preview) return { available: false, reason: 'No short preview was returned for this listing.' };
    return {
      available: true,
      artist: track.artist?.name || q,
      title: track.title || 'Artist sample',
      preview: track.preview,
      sourceUrl: track.link || `https://www.deezer.com/search/${encodeURIComponent(q)}`,
      source: 'Deezer preview',
    };
  } catch {
    return { available: false, reason: 'Music preview is unavailable right now.' };
  }
}
