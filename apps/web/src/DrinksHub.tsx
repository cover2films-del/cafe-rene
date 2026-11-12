import React, { useEffect, useState } from 'react';
import {
  drinkLibrary,
  drinkCategories,
  cocktailTastes,
  cocktailBases,
  mixologist,
  drinkFact,
} from '../../../packages/shared/src/drinks';
import { money } from '../../../packages/shared/src/index';
export function DrinksHub({ request, user }: { request: any; user: any }) {
  const [data, setData] = useState<any>({ drinks: drinkLibrary, updates: [], menus: [] }),
    [section, setSection] = useState('On tap'),
    [taste, setTaste] = useState('Any'),
    [base, setBase] = useState('Any'),
    [error, setError] = useState('');
  const load = async () => {
    try {
      setData(await request('/drinks'));
      setError('');
    } catch {
      setError(
        'Bar updates are unavailable. Browse the drink styles and ask the team for today’s selection.',
      );
    }
  };
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const r = await request('/drinks');
        if (active) {
          setData(r);
          setError('');
        }
      } catch {
        if (active) setError('Bar updates are unavailable. Ask the team for today’s selection.');
      }
    };
    void refresh();
    const t = setInterval(() => void refresh(), 60000);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      clearInterval(t);
      window.removeEventListener('focus', refresh);
    };
  }, [request]);
  const picks =
    section === 'Mixologist'
      ? mixologist(data.drinks, taste, base)
      : data.drinks.filter((d: any) => d.category === section);
  return (
    <section className="bar-hub">
      <div className="page-title">
        <div>
          <span className="eyebrow">FIND YOUR NEXT POUR</span>
          <h1>At the bar.</h1>
        </div>
      </div>
      <p>
        {data.notice ||
          'Discover drink styles, cocktail recipes and a little history. Today’s taps, prices and ingredients are confirmed by the bar team.'}
      </p>
      <div className="chips bar-tabs">
        {[...drinkCategories, 'Mixologist'].map((c) => (
          <button
            key={c}
            aria-pressed={section === c}
            className={section === c ? 'selected' : ''}
            onClick={() => setSection(c)}
          >
            {c}
          </button>
        ))}
      </div>
      {section === 'Mixologist' && (
        <div className="mixologist">
          <h2>What’s your flavour?</h2>
          <p>Choose a taste and a base for recipe inspiration, including alcohol-free options.</p>
          <label>
            Flavour
            <select value={taste} onChange={(e) => setTaste(e.target.value)}>
              {cocktailTastes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Base
            <select value={base} onChange={(e) => setBase(e.target.value)}>
              {cocktailBases.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <small>
            Recipes are inspiration, not a live stock list. Ask the team about allergens and the
            house serve.
          </small>
        </div>
      )}
      {error && <p role="status">{error}</p>}
      <div className="bar-grid">
        {picks.map((d: any) => (
          <DrinkCard key={d.id} drink={d} />
        ))}
      </div>
      {!picks.length && <p>No matches for that combination. Try another flavour or base.</p>}
      {data.updates.length > 0 && (
        <>
          <h2>Fresh from René’s bar</h2>
          <div className="bar-grid">
            {data.updates.map((p: any) => (
              <article className="bar-post" key={p.id}>
                {p.imageUrl && (
                  <img src={p.imageUrl} alt="From René’s official bar post" loading="lazy" />
                )}
                <p>{p.text}</p>
                <a href={p.url} target="_blank" rel="noreferrer">
                  Read the original post ↗
                </a>
              </article>
            ))}
          </div>
        </>
      )}
      {data.menus.length > 0 && (
        <details className="bar-sources">
          <summary>Latest published menus</summary>
          {data.menus.map((m: any) => (
            <a href={m.url} key={m.url} target="_blank" rel="noreferrer">
              {m.title} ↗
            </a>
          ))}
          <small>Linked documents refresh from the venue website.</small>
        </details>
      )}
      {user && ['manager', 'admin'].includes(user.role) && (
        <details className="bar-admin">
          <summary>Manage the bar board</summary>
          <p>
            Confirm a guest drink or update an existing entry. This does not connect stock or tills.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              const style = drinkLibrary.find((d) => d.id === f.get('styleId'))!;
              const name = String(f.get('name'));
              const id = String(
                f.get('id') || 'bar-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              ).slice(0, 60);
              try {
                await request('/manager/drinks/' + id, 'PUT', {
                  name,
                  description: String(f.get('description') || style.description),
                  category: f.get('category'),
                  styleId: style.id,
                  availability: f.get('availability'),
                  price: f.get('price') === '' ? null : Math.round(Number(f.get('price')) * 100),
                  ...(f.get('sourceUrl') ? { sourceUrl: f.get('sourceUrl') } : {}),
                });
                await load();
                form.reset();
              } catch {
                setError(
                  'The bar-board update could not be saved. Check the fields and try again.',
                );
              }
            }}
          >
            <label>
              Name
              <input name="name" required maxLength={80} />
            </label>
            <label>
              Existing ID (blank for a new entry)
              <input name="id" pattern="[a-z0-9-]+" />
            </label>
            <label>
              Drink style
              <select name="styleId">
                {drinkLibrary.map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Section
              <select name="category">
                {drinkCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Availability
              <select name="availability">
                <option value="unconfirmed">Not confirmed</option>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </label>
            <label>
              Confirmed price (£)
              <input name="price" type="number" min="0" max="1000" step="0.01" />
            </label>
            <label>
              Description
              <textarea name="description" maxLength={600} />
            </label>
            <label>
              Official website/social source
              <input name="sourceUrl" type="url" />
            </label>
            <button className="primary">Save bar board</button>
          </form>
        </details>
      )}
    </section>
  );
}
function DrinkCard({ drink: d }: { drink: any }) {
  const [fact, setFact] = useState(Math.floor(Date.now() / 86400000) % d.history.length);
  return (
    <article
      className="drink-card"
      style={{ '--drink-image': `url('/images/drinks/${d.imageKey}.webp')` } as React.CSSProperties}
    >
      <img
        className="drink-hero"
        src={'/images/drinks/' + d.imageKey + '.webp'}
        alt={'Illustration of ' + d.name}
        loading="lazy"
      />
      <div className="drink-copy">
        <span className="eyebrow">
          {d.category} · {d.taste}
        </span>
        <h3>{d.name}</h3>
        <p>{d.description}</p>
        <b className="drink-status">
          {
            (
              {
                unconfirmed: 'Ask the team about today’s selection',
                available: 'On the bar board',
                limited: 'Limited selection',
                unavailable: 'Not pouring at the moment',
              } as any
            )[d.availability]
          }
        </b>
        {d.availability !== 'unconfirmed' && d.price !== null && <b>{money(d.price)}</b>}
        {d.alcohol && <small>Staff age check applies · no food points</small>}
        <details className="drink-history">
          <summary>A little drink history</summary>
          <p>{drinkFact(d, fact)}</p>
          <button className="text-link" onClick={() => setFact((n) => n + 1)}>
            Another fact ↻
          </button>
          <a href={d.historyUrl} target="_blank" rel="noreferrer">
            Read more ↗
          </a>
        </details>
        <small>Illustrative artwork · ask the team about ingredients and allergens.</small>
      </div>
    </article>
  );
}
