import React, { useEffect, useState } from 'react';
import { foodTastes } from '../../../packages/shared/src/tastes';
import { money } from '../../../packages/shared/src/index';
import { foodPhotography } from '../../../packages/shared/src/content';
export function DiscoveryHub({
  user,
  setUser,
  request,
  run,
  onSelect,
}: {
  user: any;
  setUser: any;
  request: any;
  run: any;
  onSelect: (id: string) => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0);
  const [tastes, setTastes] = useState<string[]>(user.preferences.tastes || []),
    [enabled, setEnabled] = useState(!!user.preferences.personalisation);
  useEffect(() => {
    setTastes(user.preferences.tastes || []);
    setEnabled(!!user.preferences.personalisation);
  }, [user.preferences]);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    const load = async () => {
      if (document.hidden) return;
      try {
        const result = await request('/my-rene/discovery');
        if (active) {
          setData(result);
          setError('');
        }
      } catch {
        if (active) setError('Your favourites could not load. Please try again.');
      }
    };
    void load();
    const timer = setInterval(() => void load(), 60000);
    const focus = () => void load();
    window.addEventListener('focus', focus);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener('focus', focus);
    };
  }, [user.id, user.preferences, revision, request]);
  const cards = (items: any[]) => (
    <div className="discovery-cards">
      {items.map((item) => (
        <article className="discovery-card" key={item.id}>
          <img
            src={
              item.imageKey === 'venue-bar'
                ? '/brand/venue-interior.webp'
                : foodPhotography[item.imageKey]?.path
            }
            alt={
              item.imageKey === 'venue-bar'
                ? 'The Café René bar'
                : 'AI-generated illustration of ' + item.name
            }
            loading="lazy"
          />
          <div>
            <span className="eyebrow">{item.category}</span>
            <h4>{item.name}</h4>
            <p>{item.reason}</p>
            {item.price !== null && <b>{money(item.price)}</b>}
            {item.alcohol && <small>Staff age verification required · no food points</small>}
            {item.orderable ? (
              <button className="outline" onClick={() => onSelect(item.id)}>
                View dish ↗
              </button>
            ) : (
              <span className="bar-availability">Ask at the bar · selection and prices vary</span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
  return (
    <section className="discovery-hub" aria-label="Food and drink favourites">
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR TASTE OF RENÉ</div>
          <h2>Find your next favourite.</h2>
        </div>
      </div>
      <div className="taste-controls">
        <h3>What do you enjoy?</h3>
        <div className="chips">
          {foodTastes.map((taste) => (
            <button
              type="button"
              key={taste}
              aria-pressed={tastes.includes(taste)}
              className={tastes.includes(taste) ? 'selected' : ''}
              onClick={() =>
                setTastes((current) =>
                  current.includes(taste)
                    ? current.filter((t) => t !== taste)
                    : [...current, taste],
                )
              }
            >
              {taste}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Use my tastes and completed order history for suggestions
        </label>
        <button
          className="primary"
          onClick={() =>
            void run(async () =>
              setUser(
                await request('/preferences', 'PUT', {
                  ...user.preferences,
                  tastes,
                  personalisation: enabled,
                }),
              ),
            )
          }
        >
          Save my tastes
        </button>
        <small>
          Personalisation is optional. Turning it off shows general picks. Preferences are not an
          allergen declaration.
        </small>
      </div>
      {error && (
        <p role="alert">
          {error}{' '}
          <button className="text-link" onClick={() => setRevision((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}
      {!data && !error && <p role="status">Finding your favourites…</p>}
      {data && (
        <>
          <h3>{data.personalised ? 'Picked for you' : 'Something to try'}</h3>
          {cards(data.suggestions)}
          <h3>Popular plates</h3>
          {cards(data.popular)}
          <h3>Popular drinks</h3>
          {cards(data.drinks)}
          <p className="discovery-note">{data.note}</p>
        </>
      )}
    </section>
  );
}
