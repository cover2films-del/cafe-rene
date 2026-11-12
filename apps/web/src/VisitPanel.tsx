import React, { useEffect, useState } from 'react';
export function VisitPanel({
  user,
  request,
  onLogin,
}: {
  user: any;
  request: any;
  onLogin: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const code = new URLSearchParams(location.search).get('checkin');
  useEffect(() => {
    let active = true;
    if (user)
      request('/visits')
        .then((r: any) => {
          if (active) setData(r);
        })
        .catch(() => {});
    else setData(null);
    return () => {
      active = false;
    };
  }, [user?.id, request]);
  return (
    <section className="visit-prompt">
      <div>
        <span className="eyebrow">MAKE YOURSELF A REGULAR</span>
        <h2>{data?.checkedInToday ? 'Good to see you at René.' : 'At René? Check in.'}</h2>
        <p>
          {data?.checkedInToday
            ? 'Your visit is recorded for today.'
            : 'Scan the printed venue QR with the René app camera or your phone camera.'}
        </p>
        <small>
          Check-ins are a visit journal. Food stamps come from completed eligible food orders.
        </small>
      </div>
      <div>
        {!user ? (
          <button className="primary" onClick={onLogin}>
            Sign in to check in
          </button>
        ) : code && !data?.checkedInToday ? (
          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void (async () => {
                setBusy(true);
                try {
                  const result = await request('/visits/check-in', 'POST', { code });
                  setData(result);
                  setMessage(result.message);
                } catch {
                  setMessage(
                    'This check-in could not be recorded. Check your connection or ask the team for the current QR.',
                  );
                } finally {
                  setBusy(false);
                }
              })()
            }
          >
            Record my visit
          </button>
        ) : (
          <a
            className="outline"
            href={
              code
                ? 'caferene://checkin?code=' + encodeURIComponent(code)
                : 'caferene://checkin?scan=1'
            }
          >
            Open René camera ↗
          </a>
        )}
        <a className="text-link" href="/print/rene-check-in.pdf" target="_blank" rel="noreferrer">
          Printable venue QR ↗
        </a>
        {message && <p role="status">{message}</p>}
      </div>
    </section>
  );
}
