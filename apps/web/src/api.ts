export async function api(path: string, method = 'GET', body?: unknown, guestSecret?: string) {
  const r = await fetch('/api' + path, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(guestSecret ? { 'X-Guest-Secret': guestSecret } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Request failed');
  return d;
}
