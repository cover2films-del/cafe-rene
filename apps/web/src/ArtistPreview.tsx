import React, { useState } from 'react';
import { api } from './api';
export function ArtistPreview({ artist }: { artist: string }) {
  const [sample, setSample] = useState<any>(null), [loading, setLoading] = useState(false);
  const play = async () => {
    setLoading(true);
    try { setSample(await api('/artist-preview?q=' + encodeURIComponent(artist))); }
    catch { setSample({ available: false, reason: 'Music preview is unavailable right now.' }); }
    finally { setLoading(false); }
  };
  return <div className="artist-preview">
    <button className="outline" onClick={() => void play()} disabled={loading}>
      {loading ? 'Finding a sample…' : '▶ Hear a 30-second sample'}
    </button>
    {sample?.available ? <div className="artist-audio"><small>{sample.artist} · {sample.title} · {sample.source}</small><audio controls autoPlay preload="none" src={sample.preview} /></div> : sample && <small>{sample.reason}</small>}
  </div>;
}
