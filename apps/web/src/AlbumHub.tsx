import React, { useEffect, useState } from 'react';
const curated = [
  { id: 'venue', imageUrl: '/brand/venue-interior.webp', caption: 'Inside Café René', credit: 'Café René' },
  { id: 'gig', imageUrl: '/images/events/nov26-baron-crane.webp', caption: 'Live music at René', credit: 'Official programme' },
  { id: 'burger', imageUrl: '/images/generated/burger.webp', caption: 'A René kitchen favourite', credit: 'Café René kitchen' },
  { id: 'negroni', imageUrl: '/images/drinks/negroni.webp', caption: 'Behind the bar', credit: 'René bar team' },
];
export function AlbumHub({ request, user, run, toast }: { request: any; user: any; run: any; toast: any }) {
  const [photos, setPhotos] = useState<any[]>(curated), [url, setUrl] = useState(''), [caption, setCaption] = useState('');
  const load = async () => { const r = await request('/albums'); setPhotos([...curated, ...(r.photos || []).map((p: any) => ({ ...p, imageUrl: p.imageUrl || p.cachedImageUrl, caption: p.caption || p.text?.slice(0, 120) }))]); };
  useEffect(() => { void run(load); }, []);
  return <section className="album-hub"><div className="section-heading"><div><div className="eyebrow">THE RENÉ ALBUM</div><h2>Good times, captured.</h2></div><small className="muted">Photographer galleries and community moments.</small></div>
    <div className="album-grid">{photos.map((p) => <figure className="album-photo" key={p.id}><img src={p.imageUrl} alt={p.caption || 'Café René album photo'} loading="lazy" /><figcaption><b>{p.caption}</b><small>Photo by {p.credit || 'René community'}</small></figcaption></figure>)}</div>
    {user && <details className="album-submit"><summary>{['manager', 'admin'].includes(user.role) ? 'Add photographer or community photo' : 'Add a photo'}</summary><p>{['manager', 'admin'].includes(user.role) ? 'Add a licensed photographer image or community moment. It will be reviewed before publication.' : 'Share a photo from your René visit. Submissions are reviewed before appearing publicly.'}</p><div className="album-form"><input type="url" placeholder="Photo URL" value={url} onChange={(e) => setUrl(e.target.value)} /><input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} /><button className="primary" disabled={!url} onClick={() => void run(async () => { const r = await request('/albums/submissions', 'POST', { imageUrl: url, caption, credit: user.name }); toast(r.message); setUrl(''); setCaption(''); })}>Submit for review</button></div></details>}
  </section>;
}
