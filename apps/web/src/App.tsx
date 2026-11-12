import { socialIconPaths } from '../../../packages/shared/src/social-icons';
import { menuSources, seasonalMenu, menuChecked } from '../../../packages/shared/src/venue-menu';
import { CircleHub } from './CircleHub';
import {
  foodPhotography,
  programmeSource,
  eventGenres,
} from '../../../packages/shared/src/content';
import React, { useEffect, useState } from 'react';
import {
  Home,
  UtensilsCrossed,
  Music,
  Gift,
  User,
  ArrowUpRight,
  ArrowRight,
  MapPin,
  Clock,
  Plus,
  Minus,
  Search,
  ChevronRight,
  Check,
  ShoppingBag,
  X,
  ShieldCheck,
  Heart,
  CalendarDays,
  QrCode,
  LogOut,
  RefreshCw,
  AlertCircle,
  Download,
  Ticket,
  Mail,
  Phone,
  Leaf,
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from './api';
import { money, type BasketLine, type MenuItem } from '../../../packages/shared/src/index';
const tabs = [
  ['Home', Home],
  ['Order', UtensilsCrossed],
  ['What’s On', Music],
  ['Rewards', Gift],
  ['My René', User],
] as const;
const nextStatus: Record<string, string> = {
  awaiting_acceptance: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};
const nice = (s: string) => s.replaceAll('_', ' ');
function QR({ value }: { value: string }) {
  const [src, set] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, {
      margin: 2,
      width: 220,
      color: { dark: '#171714', light: '#faf4e7' },
    }).then(set);
  }, [value]);
  return src ? <img className="qr" src={src} alt="Scannable QR code" /> : <p>Preparing QR…</p>;
}
export function App() {
  const [boot, setBoot] = useState<any>(null),
    [user, updateUser] = useState<any>(null),
    [tab, setTab] = useState('Home'),
    [staff, setStaff] = useState(location.pathname.startsWith('/staff')),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [login, setLogin] = useState(false),
    [basket, setBasket] = useState<BasketLine[]>([]),
    [drawer, setDrawer] = useState(false),
    [table, setTable] = useState<{ ref: string; label: string } | null>(null),
    [collection, setCollection] = useState(false),
    [item, setItem] = useState<MenuItem | null>(null),
    [mods, setMods] = useState<string[]>([]),
    [notes, setNotes] = useState(''),
    [offer, setOffer] = useState(''),
    [order, setOrder] = useState<any>(null),
    [booking, setBooking] = useState(false),
    [event, setEvent] = useState<any>(null),
    [rewards, setRewards] = useState<any>(null),
    [category, setCategory] = useState('All'),
    [menuEdition, setMenuEdition] = useState('main'),
    [query, setQuery] = useState(''),
    [genre, setGenre] = useState('All'),
    [calendar, setCalendar] = useState(false),
    [checkRef, setCheckRef] = useState('');
  const setUser = (next: any) => {
    if (next?.id !== user?.id) {
      setRewards(null);
      if (order?.user_id && order.user_id !== next?.id) setOrder(null);
    }
    updateUser(next);
  };
  const run = async (fn: () => Promise<any>) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const refresh = async () => {
    const b = await api('/bootstrap');
    setBoot(b);
    try {
      setUser(await api('/me'));
    } catch {
      setUser(null);
    }
  };
  useEffect(() => {
    void run(async () => {
      await refresh();
      const ref = new URLSearchParams(location.search).get('table');
      if (ref) {
        const t = await api('/table/validate', 'POST', { ref });
        setTable({ ref, label: t.label });
        setTab('Order');
      }
      const saved = sessionStorage.getItem('rene-receipt');
      if (saved) {
        const r = JSON.parse(saved);
        setOrder(await api('/orders/' + r.id, 'GET', undefined, r.secret));
      }
    });
  }, []);
  useEffect(() => {
    if (user)
      api('/rewards')
        .then(setRewards)
        .catch(() => {});
    else setRewards(null);
  }, [user, order]);
  useEffect(() => {
    if (!order || ['completed', 'cancelled'].includes(order.status)) return;
    const timer = setInterval(() => {
      const r = JSON.parse(sessionStorage.getItem('rene-receipt') || '{}');
      api('/orders/' + order.id, 'GET', undefined, r.secret)
        .then(setOrder)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(timer);
  }, [order?.id, order?.status]);
  useEffect(() => {
    const pull = () => {
      if (document.hidden) return;
      api('/bootstrap')
        .then(setBoot)
        .catch(() => {});
    };
    const timer = setInterval(pull, 60000);
    window.addEventListener('focus', pull);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', pull);
    };
  }, []);
  const toast = (s: string) => setNotice(s);
  const go = (t: string) => {
    setTab(t);
    setStaff(false);
    window.scrollTo({
      top: 0,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  const add = (i: MenuItem) => {
    setItem(i);
    setMods([]);
  };
  const addLine = () => {
    if (!item) return;
    setBasket((b) => {
      const found = b.find((l) => l.itemId === item.id && l.modifierIds.join() === mods.join());
      return found
        ? b.map((l) => (l === found ? { ...l, quantity: Math.min(20, l.quantity + 1) } : l))
        : [...b, { itemId: item.id, quantity: 1, modifierIds: mods }];
    });
    setItem(null);
    toast('Added to your basket');
  };
  const subtotal = basket.reduce((s, l) => {
    const i = boot?.menu.find((m: MenuItem) => m.id === l.itemId);
    return (
      s +
      (i
        ? i.price +
          l.modifierIds.reduce(
            (s, id) => s + (i.modifiers.find((m: any) => m.id === id)?.price || 0),
            0,
          )
        : 0) *
        l.quantity
    );
  }, 0);
  async function checkout() {
    await run(async () => {
      const result = await api('/orders', 'POST', {
        items: basket,
        collection,
        ...(!collection && table ? { tableRef: table.ref } : {}),
        notes,
        ...(offer ? { offerId: offer } : {}),
        requestKey: crypto.randomUUID(),
      });
      sessionStorage.setItem(
        'rene-receipt',
        JSON.stringify({ id: result.order.id, secret: result.guestSecret }),
      );
      setOrder(result.order);
      setBasket([]);
      setDrawer(false);
      go('Order');
    });
  }
  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    await run(async () => {
      const result = await api('/auth/login', 'POST', {
        email: d.get('email'),
        password: d.get('password'),
      });
      setUser(result.user);
      setLogin(false);
      toast(`Welcome, ${result.user.name}`);
    });
  }
  if (!boot)
    return (
      <div className="loading">
        <div className="wordmark">
          <img
            className="official-logo"
            src={boot?.content?.logo?.url || '/brand/logo.png'}
            alt="Café René Gloucester"
          />
          <span>GLOUCESTER · EST. 2003</span>
        </div>
        <p>{error || 'Getting the good stuff ready…'}</p>
        {error && <button onClick={() => location.reload()}>Try again</button>}
      </div>
    );
  const upcoming = boot.events;
  return (
    <div className={staff ? 'app staff-app' : 'app'}>
      <div className="demo-bar">
        <span className="demo-dot" /> FOOD · LIVE MUSIC · GOOD COMPANY{' '}
        <span className="demo-detail">· GLOUCESTER</span>
        <button
          onClick={() => {
            setStaff(!staff);
            if (!user) setLogin(true);
          }}
        >
          {staff ? 'Customer app' : 'Staff workspace'} <ArrowUpRight size={12} />
        </button>
      </div>
      <header>
        <button className="wordmark" onClick={() => go('Home')}>
          <img
            className="official-logo"
            src={boot?.content?.logo?.url || '/brand/logo.png'}
            alt="Café René Gloucester"
          />
          <span>GLOUCESTER · EST. 2003</span>
        </button>
        <nav>
          {tabs.map(([t, I]) => (
            <button key={t} className={!staff && tab === t ? 'active' : ''} onClick={() => go(t)}>
              <I size={17} />
              {t}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Your basket" onClick={() => setDrawer(true)}>
            <ShoppingBag size={21} />
            {basket.length > 0 && <b>{basket.reduce((s, l) => s + l.quantity, 0)}</b>}
          </button>
          <button
            className="avatar"
            aria-label="Your account"
            onClick={() => (user ? go('My René') : setLogin(true))}
          >
            {user ? (
              user.name
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
            ) : (
              <User size={18} />
            )}
          </button>
        </div>
      </header>
      {(error || notice) && (
        <div className={'toast ' + (error ? 'error' : '')} role={error ? 'alert' : 'status'}>
          {error ? <AlertCircle size={18} /> : <Check size={18} />}
          <span>{error || notice}</span>
          <button
            aria-label="Dismiss"
            onClick={() => {
              setError('');
              setNotice('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {staff ? (
        <Staff
          user={user}
          boot={boot}
          refresh={refresh}
          run={run}
          toast={toast}
          onLogin={() => setLogin(true)}
        />
      ) : (
        <main>
          {tab === 'Home' && (
            <>
              <section className="hero">
                <div
                  className="hero-art"
                  role="img"
                  aria-label="Original illustration of a candlelit pub with a bottle-lined ceiling"
                />
                <div className="hero-shade" />
                <div className="hero-content">
                  <div className="eyebrow">
                    <span /> IN THE HEART OF GLOUCESTER
                  </div>
                  <h1>
                    Good food.
                    <br />
                    Live music.
                    <br />
                    <em>Great company.</em>
                  </h1>
                  <p>
                    Your favourite corner of the city.
                    <br />
                    Make yourself at home at René.
                  </p>
                  <div className="hero-buttons">
                    <button className="primary" onClick={() => go('Order')}>
                      Order at my table <ArrowUpRight size={18} />
                    </button>
                    <button className="glass" onClick={() => go('What’s On')}>
                      Find your next night <ArrowRight size={18} />
                    </button>
                  </div>
                  <div className="hero-bottom">
                    <MapPin size={15} /> 31 Southgate Street <span>✦</span> Independently spirited
                    since 2003
                  </div>
                </div>
                <div className="art-caption">
                  Bottle-ceiling study · Original illustration, not venue photography
                </div>
                <div className="hero-food">
                  <div className="hero-food-main">
                    <img
                      src={boot?.content?.programmes?.[0]?.url || '/programme/november-2026.webp'}
                      alt="Official Café René programme artwork"
                      fetchPriority="high"
                    />
                    <span>Straight from René’s wall.</span>
                  </div>
                  <div className="hero-food-small">
                    <img
                      src="/images/food/cod.webp"
                      alt="Illustrative fish and chips photography"
                    />
                    <span>Something worth settling in for.</span>
                  </div>
                  <small>Official programme artwork · food photography illustrative</small>
                </div>
                <div className="hero-seal">
                  FOOD
                  <br />
                  <span>✦</span>
                  <br />
                  MUSIC & SOUL
                </div>
              </section>
              <div className="live-ribbon">
                <span>FOOD / MUSIC / GOOD COMPANY</span>
                {upcoming.slice(0, 4).map((e: any) => (
                  <button key={e.id} onClick={() => setEvent(e)}>
                    {e.title}{' '}
                    <b>
                      {new Date(e.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        timeZone: 'Europe/London',
                      })}
                    </b>{' '}
                    ✦
                  </button>
                ))}
              </div>
              <div className="venue-strip">
                <div>
                  <Clock />
                  <span>
                    <b>Stay a little longer</b>
                    <small>Bar & kitchen hours below · manager review pending</small>
                  </span>
                </div>
                <button onClick={() => setBooking(true)}>
                  Book a table <ArrowUpRight size={16} />
                </button>
                <a
                  href="https://maps.google.com/?q=Cafe+Rene+31+Southgate+Street+Gloucester"
                  target="_blank"
                  rel="noreferrer"
                >
                  Find us <ArrowUpRight size={16} />
                </a>
              </div>
              <section className="section">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">THE SOUND OF RENÉ</div>
                    <h2>Find your kind of night.</h2>
                  </div>
                  <button className="text-link" onClick={() => go('What’s On')}>
                    See what’s on <ArrowRight size={17} />
                  </button>
                </div>
                <div className="events-grid">
                  {!upcoming.length && (
                    <div className="empty-programme">
                      <h3>The next chapter is coming.</h3>
                      <p>Check René’s official programme for the latest nights.</p>
                      <a
                        className="text-link"
                        href={programmeSource}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Official programme ↗
                      </a>
                    </div>
                  )}
                  {upcoming.slice(0, 3).map((e: any, i: number) => (
                    <EventCard key={e.id} event={e} index={i} onClick={() => setEvent(e)} />
                  ))}
                </div>
                <p className="muted caption">
                  {upcoming.some((e: any) => !e.sample)
                    ? 'Current programme · event details link to reviewed venue sources.'
                    : 'Programme preview · sample events are labelled.'}{' '}
                  <a href={boot.venue.facebook} target="_blank" rel="noreferrer">
                    Check René’s Facebook for official listings ↗
                  </a>
                </p>
              </section>
              <VenueBoard
                content={boot.content}
                facebook={boot.venue.facebook}
                instagram={boot.venue.instagram}
              />
              <section className="food-banner">
                <div>
                  <div className="eyebrow">PULL UP A CHAIR</div>
                  <h2>
                    A proper appetite.
                    <br />
                    <em>A proper pub.</em>
                  </h2>
                  <p>
                    From the Desperate Dan burger to comforting pub classics.
                    <br />
                    Find something worth settling in for.
                  </p>
                  <button className="primary" onClick={() => go('Order')}>
                    Explore the menu <ArrowRight size={17} />
                  </button>
                </div>
                <div className="food-art food-photography">
                  <img
                    src="/images/food/cod.webp"
                    alt="Illustrative fish and chips photography"
                    loading="lazy"
                  />
                  <div>
                    <span>AT THE TABLE</span>
                    <strong>Stay for another bite.</strong>
                    <small>Illustrative photography. Actual dishes may vary.</small>
                  </div>
                </div>
              </section>
              <section className="section rewards-teaser">
                <div className="reward-crest">
                  R<span>✦</span>
                </div>
                <div>
                  <div className="eyebrow">A LITTLE MORE RENÉ</div>
                  <h2>Good nights deserve good rewards.</h2>
                  <p>Collect moments, discover something new and become a René regular.</p>
                  {rewards && (
                    <p className="gold">
                      {rewards.challenges[1].progress} / 5 verified visit days · René Regular
                    </p>
                  )}
                </div>
                <button className="outline" onClick={() => go('Rewards')}>
                  Meet your rewards <ArrowRight size={16} />
                </button>
              </section>
              <section className="visit section">
                <div>
                  <div className="eyebrow">COME ON OVER</div>
                  <h2>
                    Hidden away.
                    <br />
                    Right in the middle of it all.
                  </h2>
                  <p>{boot.venue.address}</p>
                  <div className="contact-links">
                    <a href="tel:01452309340">
                      <Phone size={16} />
                      01452 309340
                    </a>
                    <a href="mailto:info@caferene.co.uk">
                      <Mail size={16} />
                      info@caferene.co.uk
                    </a>
                  </div>
                </div>
                <div className="hours">
                  <h3>Make a night of it</h3>
                  <p>
                    <b>The bar</b>
                    <br />
                    {boot.venue.hours}
                  </p>
                  <p>
                    <b>The kitchen</b>
                    <br />
                    {boot.venue.foodHours}
                  </p>
                  <small>
                    Hours await manager confirmation. Last entry Fri/Sat 1am. A 24-hour licence does
                    not mean 24-hour opening.
                  </small>
                </div>
              </section>
            </>
          )}
          {tab === 'Order' && (
            <section className="section order-page">
              <div className="page-title">
                <div>
                  <div className="eyebrow">GOOD FOOD, YOUR WAY</div>
                  <h1>The menu.</h1>
                  <p>Settle in. We’ll bring it to you.</p>
                </div>
                <span className="pill">
                  <span className="demo-dot" />
                  Kitchen {boot.ordering.open ? 'open' : 'paused'}
                </span>
              </div>
              <div className="ordering-context">
                <QrCode size={22} />
                <div>
                  <b>
                    {collection ? 'Collect from the bar' : table?.label || 'Where are you sitting?'}
                  </b>
                  <small>
                    {table && !collection
                      ? 'Signed table reference verified by the server'
                      : 'Choose your table or scan the QR on your table'}
                  </small>
                </div>
                <select
                  aria-label="Ordering location"
                  value={collection ? 'collection' : table?.label.split(' ')[1] || ''}
                  onChange={(e) =>
                    void run(async () => {
                      if (e.target.value === 'collection') {
                        setCollection(true);
                        return;
                      }
                      setCollection(false);
                      setTable(await api('/demo/table/' + e.target.value));
                    })
                  }
                >
                  <option value="" disabled>
                    Choose table
                  </option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      Table {i + 1}
                    </option>
                  ))}
                  <option value="collection">Collection</option>
                </select>
              </div>
              {order && (
                <div className="order-status">
                  <div>
                    <div className="eyebrow">
                      ORDER PREVIEW · {order.id.slice(0, 8).toUpperCase()}
                    </div>
                    <h3>{nice(order.status)}</h3>
                    <p>
                      {money(order.total)} · Payment: {order.payment}{' '}
                      {order.status === 'awaiting_acceptance'
                        ? '· Waiting for staff acceptance'
                        : ''}
                    </p>
                    <small>
                      {order.status === 'completed'
                        ? 'Receipt ready. Eligible food rewards issued.'
                        : 'This is a simulated order. No food will be prepared.'}
                    </small>
                  </div>
                  {order.payment === 'unpaid' && order.status !== 'cancelled' && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const r = JSON.parse(sessionStorage.getItem('rene-receipt') || '{}');
                          setOrder(
                            await api('/orders/' + order.id + '/mock-pay', 'POST', {}, r.secret),
                          );
                          toast('Mock webhook verified. Waiting for staff/POS acceptance.');
                        })
                      }
                    >
                      Simulate payment <ShieldCheck size={17} />
                    </button>
                  )}
                  {order.payment === 'unpaid' && order.status !== 'cancelled' && (
                    <button
                      className="outline"
                      onClick={() =>
                        void run(async () => {
                          const r = JSON.parse(sessionStorage.getItem('rene-receipt') || '{}');
                          await api('/orders/' + order.id + '/cancel', 'POST', {}, r.secret);
                          setOrder(await api('/orders/' + order.id, 'GET', undefined, r.secret));
                        })
                      }
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="text-link"
                    onClick={() =>
                      void run(async () => {
                        const r = JSON.parse(sessionStorage.getItem('rene-receipt') || '{}');
                        const receipt = await api(
                          '/orders/' + order.id,
                          'GET',
                          undefined,
                          r.secret,
                        );
                        download('rene-receipt.json', receipt);
                      })
                    }
                  >
                    <Download size={16} />
                    Receipt
                  </button>
                </div>
              )}
              <div className="published-menus">
                <div className="eyebrow">FROM THE RENÉ KITCHEN · PUBLISHED MENUS</div>
                <div className="chips menu-editions" aria-label="Choose a menu">
                  {menuSources.map((source) => (
                    <button
                      key={source.id}
                      className={menuEdition === source.id ? 'selected' : ''}
                      onClick={() => {
                        setMenuEdition(source.id);
                        setCategory('All');
                      }}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
                <p>{menuSources.find((source) => source.id === menuEdition)?.note}</p>
                <a
                  href={menuSources.find((source) => source.id === menuEdition)?.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the original menu ↗
                </a>
                <small>
                  Published prices checked {menuChecked}. Availability and dietary requirements:
                  please ask the team. Meal deals are arranged with staff.
                </small>
              </div>
              {['festive', 'christmas-day', 'christmas-children'].includes(menuEdition) && (
                <div className="seasonal-courses">
                  {seasonalMenu(menuEdition).map((dish) => (
                    <article className="seasonal-dish" key={dish.name}>
                      <img
                        src={'/images/generated/' + dish.imageKey + '.webp'}
                        alt={'AI illustration of ' + dish.name}
                        loading="lazy"
                      />
                      <div>
                        <span className="eyebrow">{dish.course}</span>
                        <h3>{dish.name}</h3>
                        <p>{dish.description}</p>
                        <small>Included in the set menu · AI illustration</small>
                      </div>
                    </article>
                  ))}
                  <a className="primary" href="mailto:info@caferene.co.uk">
                    Book your festive meal ↗
                  </a>
                </div>
              )}
              <div className="menu-toolbar">
                <div className="chips">
                  {[
                    'All',
                    ...new Set<string>(
                      boot.menu
                        .filter((m: MenuItem) => (m.menuEdition || 'main') === menuEdition)
                        .map((m: MenuItem) => m.category),
                    ),
                  ].map((c) => (
                    <button
                      key={c}
                      className={category === c ? 'selected' : ''}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Search size={17} />
                  <input
                    placeholder="Find your favourite"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              <div className="allergen-note">
                <Leaf size={17} />
                <span>
                  Menu prices are unapproved published prices. Allergen data is unavailable — ask
                  staff before ordering. Dietary labels are transcribed from the source menu and
                  await review.
                </span>
              </div>
              <div className="menu-grid">
                {boot.menu
                  .filter(
                    (m: MenuItem) =>
                      (m.menuEdition || 'main') === menuEdition &&
                      (category === 'All' || m.category === category) &&
                      m.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((m: MenuItem) => (
                    <article
                      className={'menu-card ' + (!m.available ? 'unavailable' : '')}
                      key={m.id}
                    >
                      <div
                        className={
                          'dish-art ' +
                          (foodPhotography[m.imageKey || m.id] ? 'has-photo ' : '') +
                          m.category.toLowerCase().split(' ')[0]
                        }
                      >
                        {foodPhotography[m.imageKey || m.id] && (
                          <img
                            className="dish-photo"
                            src={foodPhotography[m.imageKey || m.id].path}
                            alt={foodPhotography[m.imageKey || m.id].alt}
                            loading="lazy"
                            width={1000}
                            height={750}
                          />
                        )}
                        <span>
                          {m.category === 'Drinks'
                            ? '◈'
                            : m.category === 'Desserts'
                              ? '✦'
                              : m.category === 'Sides'
                                ? '≋'
                                : m.category === 'Burgers'
                                  ? '☷'
                                  : '❦'}
                        </span>
                        <small>
                          {foodPhotography[m.imageKey || m.id]
                            ? 'AI DISH ILLUSTRATION'
                            : m.category}
                        </small>
                      </div>
                      <div className="menu-copy">
                        <span className="micro">
                          {m.alcohol
                            ? 'STAFF AGE CHECK REQUIRED'
                            : m.dietary.length
                              ? 'SOURCE DIETARY LABEL · UNVERIFIED'
                              : 'RENÉ KITCHEN'}
                        </span>
                        <h3>{m.name}</h3>
                        <p>{m.description}</p>
                        <div>
                          <b>{money(m.price)}</b>
                          <button
                            aria-label={'Add ' + m.name}
                            disabled={!m.available}
                            className="add"
                            onClick={() => add(m)}
                          >
                            {m.available ? <Plus size={20} /> : <span>Sold out</span>}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
              </div>
              {boot.menu.filter(
                (m: MenuItem) =>
                  (m.menuEdition || 'main') === menuEdition &&
                  (category === 'All' || m.category === category) &&
                  m.name.toLowerCase().includes(query.toLowerCase()),
              ).length === 0 && <div className="empty">No dishes found. Try another search.</div>}
              {basket.length > 0 && (
                <button className="basket-float primary" onClick={() => setDrawer(true)}>
                  <ShoppingBag size={20} />
                  {basket.reduce((s, l) => s + l.quantity, 0)} items · View basket{' '}
                  <b>{money(subtotal)}</b>
                </button>
              )}
            </section>
          )}
          {tab === 'What’s On' && (
            <section className="section">
              <VenueBoard
                content={boot.content}
                facebook={boot.venue.facebook}
                instagram={boot.venue.instagram}
              />
              <div className="page-title">
                <div>
                  <div className="eyebrow">LIVE & IN GOOD COMPANY</div>
                  <h1>What’s on.</h1>
                  <p>Discover your next favourite night.</p>
                </div>
                <button className="outline" onClick={() => setCalendar(!calendar)}>
                  <CalendarDays size={17} />
                  {calendar ? 'Card view' : 'Calendar view'}
                </button>
              </div>
              <div className="chips">
                {['All', ...new Set<string>(upcoming.map((e: any) => e.genre))].map((g) => (
                  <button
                    key={g}
                    className={genre === g ? 'selected' : ''}
                    onClick={() => setGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <p className="allergen-note">
                Current programme from reviewed venue sources. Check event details for the source
                and any late changes. Sample events are labelled.
              </p>
              <div className={calendar ? 'calendar-list' : 'events-grid'}>
                {!upcoming.filter((e: any) => genre === 'All' || e.genre === genre).length && (
                  <div className="empty-programme">
                    <h3>No nights in this selection yet.</h3>
                    <a
                      className="text-link"
                      href={programmeSource}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check the official programme ↗
                    </a>
                  </div>
                )}
                {upcoming
                  .filter((e: any) => genre === 'All' || genre === e.genre)
                  .map((e: any, i: number) => (
                    <EventCard key={e.id} event={e} index={i} onClick={() => setEvent(e)} />
                  ))}
              </div>
              <div className="festival-panel">
                <Music size={38} />
                <div>
                  <h2>The festival spirit.</h2>
                  <p>
                    René’s annual blues festival is part of the venue’s story. Dates and the next
                    programme await confirmation.
                  </p>
                  <button className="text-link" onClick={() => go('Rewards')}>
                    Explore your Festival Faithful passport <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {tab === 'Rewards' && (
            <section className="section">
              <div className="page-title">
                <div>
                  <div className="eyebrow">MORE THAN A NIGHT OUT</div>
                  <h1>Your René story.</h1>
                  <p>Collect experiences. Find your people. Get a little back.</p>
                </div>
              </div>
              {!user ? (
                <div className="empty">
                  <Gift size={45} />
                  <h2>Make yourself a regular.</h2>
                  <p>Sign in to collect René Points and keep track of your visits.</p>
                  <button className="primary" onClick={() => setLogin(true)}>
                    Sign in to rewards <ArrowRight size={16} />
                  </button>
                </div>
              ) : (
                rewards && (
                  <>
                    <RenéSnapshot rewards={rewards} user={user} />
                    <div className="reward-top">
                      <div className="membership">
                        <div className="eyebrow">
                          THE RENÉ CIRCLE <span aria-hidden="true">✦</span> YOUR LOCAL, YOUR PEOPLE
                        </div>
                        <div className="wordmark loyalty-brand">
                          <img
                            className="official-logo"
                            src={boot?.content?.logo?.url || '/brand/logo.png'}
                            alt="Café René Gloucester"
                          />
                        </div>
                        <p className="member-name">{user.name}</p>
                        <div className="member-points">
                          <strong>{rewards.points}</strong>
                          <span>René Points · member balance</span>
                        </div>
                        <QR value={rewards.membership} />
                        <small>Membership reference · refreshes on reload</small>
                      </div>
                      <div className="checkin-card">
                        <QrCode size={35} />
                        <h2>Here for a good time?</h2>
                        <p>
                          Scan the rotating venue QR in the native app, or paste its reference
                          below. Location alone never awards a visit.
                        </p>
                        <input
                          placeholder="Paste rotating venue QR reference"
                          value={checkRef}
                          onChange={(e) => setCheckRef(e.target.value)}
                        />
                        <button
                          className="primary"
                          disabled={busy || !checkRef}
                          onClick={() =>
                            void run(async () => {
                              setRewards(await api('/checkin', 'POST', { ref: checkRef }));
                              toast('Visit verified. Your René story is growing.');
                            })
                          }
                        >
                          Verify my visit <Check size={16} />
                        </button>
                        <small>
                          One verified visit per London calendar day. Ask staff if you need help.
                        </small>
                      </div>
                    </div>
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">MOMENTS WORTH COLLECTING</div>
                        <h2>A little adventure.</h2>
                      </div>
                    </div>
                    <div className="challenge-grid">
                      {rewards.challenges.map((c: any) => (
                        <div
                          className={'challenge ' + (c.progress >= c.target ? 'complete' : '')}
                          key={c.id}
                        >
                          <span className="badge-icon">{c.icon}</span>
                          <h3>{c.name}</h3>
                          <p>{c.description}</p>
                          <progress max={c.target} value={c.progress} />
                          <small>
                            {c.progress >= c.target
                              ? '✦ Achievement unlocked'
                              : `${c.progress} / ${c.target} complete`}
                          </small>
                        </div>
                      ))}
                    </div>
                    <h2>A treat for next time.</h2>
                    <div className="offers">
                      {rewards.offers.map((o: any) => (
                        <div className="offer" key={o.id}>
                          <Gift />
                          <div>
                            <span className="micro">SAMPLE OFFER</span>
                            <h3>{o.name}</h3>
                            <p>{o.description}</p>
                            <small>
                              Expires {new Date(o.expires).toLocaleDateString('en-GB')} · Single use
                              · Food only
                            </small>
                          </div>
                          <button
                            className="outline"
                            disabled={!o.eligible}
                            onClick={() => {
                              setOffer(o.id);
                              go('Order');
                              toast(
                                'Offer selected. Eligibility and discount checked at checkout.',
                              );
                            }}
                          >
                            {o.eligible ? 'Use offer' : 'Unavailable'}
                          </button>
                        </div>
                      ))}
                    </div>
                    <h3>Points history</h3>
                    {rewards.history.length ? (
                      rewards.history.map((h: any, i: number) => (
                        <div className="list-row" key={i}>
                          {nice(h.reason)}
                          <b>
                            {h.points > 0 ? '+' : ''}
                            {h.points} pts
                          </b>
                        </div>
                      ))
                    ) : (
                      <p className="muted">
                        Your first completed eligible purchase starts your points story.
                      </p>
                    )}
                  </>
                )
              )}
            </section>
          )}
          {tab === 'My René' && (
            <section className="section">
              {user?.id !== 'daniel' && (
                <div className="daniel-demo-banner">
                  <div>
                    <b>Daniel’s René Circle.</b>
                    <p>Sample food & drink history, 100 René Points, stamps and a private group.</p>
                  </div>
                  <button
                    className="primary"
                    onClick={() =>
                      void run(async () => {
                        const r = await api('/auth/login', 'POST', {
                          email: 'daniel@demo.rene',
                          password: 'ReneDemo2026!',
                        });
                        setUser(r.user);
                        toast('Viewing Daniel Woolf’s account');
                      })
                    }
                  >
                    Explore Daniel’s René
                  </button>
                </div>
              )}
              <div className="page-title">
                <div>
                  <div className="eyebrow">YOUR LITTLE CORNER</div>
                  <h1>My René.</h1>
                </div>
                {user && (
                  <button
                    className="outline"
                    onClick={() =>
                      void run(async () => {
                        await api('/auth/logout', 'POST', {});
                        setUser(null);
                        toast('Signed out');
                      })
                    }
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                )}
              </div>
              {user ? (
                <Account
                  key={user.id}
                  user={user}
                  setUser={setUser}
                  run={run}
                  toast={toast}
                  onBook={() => setBooking(true)}
                  order={order}
                  rewards={rewards}
                />
              ) : (
                <div className="empty">
                  <User size={42} />
                  <h2>Come as you are.</h2>
                  <p>Browse and order as a guest. Sign in when you’re ready to make it yours.</p>
                  <button className="primary" onClick={() => setLogin(true)}>
                    Sign in / create account <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer>
            <div className="wordmark">
              <img
                className="official-logo"
                src={boot?.content?.logo?.url || '/brand/logo.png'}
                alt="Café René Gloucester"
              />
              <span>FOOD. MUSIC. GOOD COMPANY.</span>
            </div>
            <p>31 Southgate Street · Gloucester · GL1 1TP</p>
            <div>
              <a href={boot.venue.website} target="_blank" rel="noreferrer">
                Official website ↗
              </a>
              <a href={boot.venue.facebook} target="_blank" rel="noreferrer">
                <SocialLogo platform="facebook" /> Facebook ↗
              </a>
              <a href={boot.venue.instagram} target="_blank" rel="noreferrer">
                <SocialLogo platform="instagram" /> Instagram ↗
              </a>
              <a href="/photography.html">Photo credits</a>
              <button onClick={() => go('My René')}>Privacy & preferences</button>
            </div>
            <small>
              Food images are illustrations · Programme details link to the venue · Menu prices and
              hours await review
            </small>
          </footer>
        </main>
      )}
      {!staff && (
        <nav className="mobile-tabs">
          {tabs.map(([t, I]) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => go(t)}>
              <I size={21} />
              <span>{t}</span>
            </button>
          ))}
        </nav>
      )}
      {login && (
        <Modal title="Welcome to René." onClose={() => setLogin(false)}>
          <p className="muted">Sign in to your René Circle.</p>
          <form onSubmit={signIn}>
            <label>
              Email
              <input name="email" type="email" required placeholder="you@example.com" />
            </label>
            <label>
              Password
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
            <button className="primary full" disabled={busy}>
              Sign in <ArrowRight size={17} />
            </button>
          </form>
          <div className="demo-accounts">
            {['daniel', 'demo-alex', 'demo-sam', 'customer', 'staff', 'manager', 'admin'].map(
              (r) => (
                <button
                  key={r}
                  onClick={() =>
                    void run(async () => {
                      const d = await api('/auth/login', 'POST', {
                        email: r + '@demo.rene',
                        password: 'ReneDemo2026!',
                      });
                      setUser(d.user);
                      setLogin(false);
                      toast('Signed in as ' + ({ 'demo-alex': 'Alex', 'demo-sam': 'Sam' }[r] || r));
                    })
                  }
                >
                  {{ 'demo-alex': 'Alex', 'demo-sam': 'Sam' }[r] || r}
                </button>
              ),
            )}
          </div>
          <details>
            <summary>Create an account</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void run(async () => {
                  const u = await api('/auth/register', 'POST', {
                    name: d.get('name'),
                    email: d.get('email'),
                    password: d.get('password'),
                  });
                  setUser(u.user);
                  setLogin(false);
                });
              }}
            >
              <label>
                Name
                <input name="name" required maxLength={60} />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password · 12+ characters
                <input name="password" type="password" minLength={12} required />
              </label>
              <button className="primary" disabled={busy}>
                Create account
              </button>
            </form>
          </details>
        </Modal>
      )}
      {item && (
        <Modal title={item.name} onClose={() => setItem(null)}>
          <span className="pill">{item.category} · Published menu</span>
          {foodPhotography[item.imageKey || item.id] && (
            <figure className="dish-detail">
              <img
                src={foodPhotography[item.imageKey || item.id].path}
                alt={foodPhotography[item.imageKey || item.id].alt}
              />
              <figcaption>
                AI-generated illustration based on the menu description. Actual presentation may
                vary.
              </figcaption>
            </figure>
          )}
          <p>{item.description}</p>
          <p className="allergen-note">
            Allergens unverified. Ask staff before ordering.{' '}
            {item.alcohol ? 'Staff must verify age before acceptance.' : ''}
          </p>
          {item.modifiers.map((m) => (
            <label className="check-row" key={m.id}>
              <input
                type="checkbox"
                checked={mods.includes(m.id)}
                onChange={(e) =>
                  setMods((v) => (e.target.checked ? [...v, m.id] : v.filter((id) => id !== m.id)))
                }
              />
              {m.name}
              <b>+{money(m.price)}</b>
            </label>
          ))}
          <button className="primary full" onClick={addLine}>
            Add to basket{' '}
            <b>
              {money(
                item.price +
                  item.modifiers
                    .filter((m) => mods.includes(m.id))
                    .reduce((s, m) => s + m.price, 0),
              )}
            </b>
          </button>
        </Modal>
      )}
      {drawer && (
        <Modal title="Your basket." onClose={() => setDrawer(false)} side>
          {basket.length ? (
            <>
              {basket.map((l, i) => {
                const m = boot.menu.find((m: MenuItem) => m.id === l.itemId);
                return (
                  <div className="basket-line" key={i}>
                    <div>
                      <h3>{m.name}</h3>
                      <small>
                        {l.modifierIds
                          .map((id) => m.modifiers.find((x: any) => x.id === id)?.name)
                          .join(', ')}
                      </small>
                      <b>
                        {money(
                          (m.price +
                            l.modifierIds.reduce(
                              (s, id) =>
                                s + (m.modifiers.find((x: any) => x.id === id)?.price || 0),
                              0,
                            )) *
                            l.quantity,
                        )}
                      </b>
                    </div>
                    <div className="quantity">
                      <button
                        aria-label="Remove one"
                        onClick={() =>
                          setBasket((b) =>
                            b
                              .map((v, n) => (n === i ? { ...v, quantity: v.quantity - 1 } : v))
                              .filter((v) => v.quantity > 0),
                          )
                        }
                      >
                        <Minus size={14} />
                      </button>
                      {l.quantity}
                      <button
                        aria-label="Add one"
                        onClick={() =>
                          setBasket((b) =>
                            b.map((v, n) =>
                              n === i ? { ...v, quantity: Math.min(20, v.quantity + 1) } : v,
                            ),
                          )
                        }
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <label>
                Kitchen notes
                <textarea
                  maxLength={500}
                  placeholder="Anything the team should know? For allergies, speak to staff directly."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
              {rewards && (
                <label>
                  Offer
                  <select value={offer} onChange={(e) => setOffer(e.target.value)}>
                    <option value="">No offer</option>
                    {rewards.offers
                      .filter((o: any) => o.eligible)
                      .map((o: any) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <div className="list-row">
                <span>Subtotal</span>
                <b>{money(subtotal)}</b>
              </div>
              <p className="muted">
                {collection
                  ? 'Collection at the bar'
                  : table?.label || 'Choose a table in Order before checkout'}
                . Discounts and final total calculated by the server.
              </p>
              <p className="allergen-note">
                Simulated order and payment. No real card details required. Checkout requires a
                connection.
              </p>
              <button
                className="primary full"
                disabled={busy || (!table && !collection)}
                onClick={() => void checkout()}
              >
                Preview order <ArrowRight size={18} />
              </button>
              {!user && (
                <p className="muted">
                  Ordering as a guest. Keep this browser session for your receipt. Sign in after
                  purchase to link it securely.
                </p>
              )}
            </>
          ) : (
            <div className="empty">
              <ShoppingBag size={40} />
              <h3>Room for something good.</h3>
              <button
                className="primary"
                onClick={() => {
                  setDrawer(false);
                  go('Order');
                }}
              >
                Explore the menu
              </button>
            </div>
          )}
        </Modal>
      )}
      {event && (
        <Modal title={event.title} onClose={() => setEvent(null)}>
          <span className="pill">
            {event.sample ? 'SAMPLE EVENT' : 'OFFICIAL VENUE PROGRAMME'} · {event.genre}
          </span>
          {event.imageUrl && (
            <img
              className="event-detail-image"
              src={event.imageUrl}
              alt={event.title + ' · official Café René programme graphic'}
            />
          )}
          <p className="gold">
            {new Date(event.date).toLocaleString('en-GB', {
              timeZone: 'Europe/London',
              dateStyle: 'full',
              timeStyle: 'short',
            })}
          </p>
          <p>{event.description}</p>
          <p className="allergen-note">
            {event.sample
              ? 'Sample listing. No real admission is arranged.'
              : 'Listed in the venue programme. Please check the official source for changes.'}{' '}
            Reminder delivery is not connected.
          </p>
          <div className="button-row">
            <button
              className="outline"
              onClick={() =>
                user
                  ? void run(async () => {
                      toast(
                        (await api('/favourites/' + event.id, 'POST', { reminder: true })).message,
                      );
                    })
                  : setLogin(true)
              }
            >
              <Heart size={17} />
              Save & remind me
            </button>
            <button
              className="primary"
              onClick={() =>
                event.sample
                  ? user
                    ? void run(async () =>
                        toast((await api('/tickets/' + event.id, 'POST', {})).message),
                      )
                    : setLogin(true)
                  : window.open(event.sourceUrl || programmeSource, '_blank', 'noopener,noreferrer')
              }
            >
              <Ticket size={17} />
              {event.sample ? 'Example ticket' : 'Official event information'}
            </button>
          </div>
        </Modal>
      )}
      {booking && (
        <Modal title="A table for your people." onClose={() => setBooking(false)}>
          <p>
            Requests need confirmation from the venue. To book, call{' '}
            <a href="tel:01452309340">01452 309340</a>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!user) {
                setLogin(true);
                return;
              }
              const d = new FormData(e.currentTarget);
              void run(async () => {
                const result = await api('/bookings', 'POST', {
                  date: new Date(String(d.get('date'))).toISOString(),
                  party: Number(d.get('party')),
                  notes: String(d.get('notes')),
                });
                toast(result.message);
                setBooking(false);
              });
            }}
          >
            <label>
              Date & time · your local time
              <input type="datetime-local" name="date" required />
            </label>
            <label>
              Your party
              <input type="number" name="party" min="1" max="12" defaultValue="2" required />
            </label>
            <label>
              A note for the team
              <textarea name="notes" maxLength={300} />
            </label>
            <button className="primary" disabled={busy}>
              {user ? 'Request a table' : 'Sign in to request'}
              <ArrowRight size={17} />
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
function VenueBoard({
  content,
  facebook,
  instagram,
}: {
  content: any;
  facebook: string;
  instagram: string;
}) {
  const programmes = content?.programmes || [
      { id: 'fallback', url: '/programme/november-2026.webp' },
    ],
    posts = content?.posts || [];
  return (
    <section className="venue-board section">
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE RENÉ NOTICEBOARD</div>
          <h2>Fresh off the wall.</h2>
        </div>
        <span className="fresh-pill">
          ✦{' '}
          {content?.checkedAt
            ? 'Checked ' +
              new Date(content.checkedAt).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/London',
              })
            : 'Official venue artwork'}
        </span>
      </div>
      <div className="board-layout">
        <div className="programme-wall">
          {programmes.map((p: any) => (
            <a key={p.id} className="official-poster" href={p.url} target="_blank" rel="noreferrer">
              <img src={p.url} alt="Café René official What’s On programme" loading="lazy" />
              <span>Open the full programme ↗</span>
            </a>
          ))}
          {!programmes.length && (
            <div className="panel">
              <h3>The next programme is on its way.</h3>
              <a href={programmeSource} target="_blank" rel="noreferrer">
                Check the official website ↗
              </a>
            </div>
          )}
        </div>
        <div className="social-wall">
          {posts.length ? (
            posts.slice(0, 6).map((p: any) => (
              <article className={'social-post ' + p.platform} key={p.id}>
                <div className="social-byline">
                  <b>
                    <SocialLogo platform={p.platform === 'instagram' ? 'instagram' : 'facebook'} />
                    {p.platform === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK'}
                  </b>
                  <span>CAFÉ RENÉ</span>
                </div>
                {p.imageUrl && (
                  <img
                    src={p.imageUrl}
                    alt="Image from Café René’s official social post"
                    loading="lazy"
                  />
                )}
                <p>{p.text}</p>
                <a href={p.url} target="_blank" rel="noreferrer">
                  View original post ↗
                </a>
                <small>{p.date && new Date(p.date).toLocaleDateString('en-GB')}</small>
              </article>
            ))
          ) : (
            <>
              <a
                className="follow-card instagram"
                href={instagram}
                target="_blank"
                rel="noreferrer"
              >
                <SocialLogo platform="instagram" />
                <div>
                  <small>BEHIND THE SCENES / ON THE STAGE</small>
                  <h3>The René feed.</h3>
                  <p>Food, faces and the nights you’ll talk about tomorrow.</p>
                  <b>Follow @cafereneglos ↗</b>
                </div>
              </a>
              <a className="follow-card facebook" href={facebook} target="_blank" rel="noreferrer">
                <SocialLogo platform="facebook" />
                <div>
                  <small>KEEP THE GOOD NIGHTS COMING</small>
                  <h3>Don’t miss a beat.</h3>
                  <p>Head to René’s Facebook for the venue’s latest posts.</p>
                  <b>Visit Café René on Facebook ↗</b>
                </div>
              </a>
              <div className="board-note">
                <h3>
                  Real food.
                  <br />
                  Real music.
                  <br />
                  Proper René.
                </h3>
                <a href={programmeSource} target="_blank" rel="noreferrer">
                  From the official website ↗
                </a>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="source-note">
        Official venue graphics update from the website.{' '}
        {content?.stale
          ? 'Showing the last available programme; check the source for changes.'
          : 'Refreshes automatically while the app is open and the server is awake.'}{' '}
        Tap artwork to read it in full.
      </p>
    </section>
  );
}

function EventCard({
  event: e,
  index,
  onClick,
}: {
  event: any;
  index: number;
  onClick: () => void;
}) {
  const date = new Date(e.date);
  return (
    <button className="event-card" onClick={onClick}>
      <div className={'event-art art-' + (index % 3)}>
        {e.imageUrl && (
          <img
            className="event-backdrop"
            src={e.imageUrl}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        )}
        <span className="sample-tag">{e.sample ? 'SAMPLE EVENT' : 'RENÉ LIVE'}</span>
        {e.imageUrl && (
          <img
            className="event-image"
            src={e.imageUrl}
            alt={e.title + ' · official Café René programme graphic'}
            loading="lazy"
          />
        )}
        <div className={'gig-type ' + (e.imageUrl ? 'visually-hidden' : '')}>
          {!e.sample ? (
            <>
              <span>{e.genre}</span>
              <strong className="actual-event-name">{e.title}</strong>
              <i>Live at René</i>
            </>
          ) : e.genre === 'Blues' ? (
            <>
              <span>FEEL THE</span>
              <strong>BLUES</strong>
              <i>live & loud</i>
            </>
          ) : e.genre === 'DJ' ? (
            <>
              <span>AFTER HOURS</span>
              <strong>
                CELLAR
                <br />
                SELECTS
              </strong>
              <i>find your rhythm</i>
            </>
          ) : (
            <>
              <span>THE SUNDAY</span>
              <strong>SESSIONS</strong>
              <i>stripped back. turned up.</i>
            </>
          )}
        </div>
        <div className="date-stamp">
          <b>{date.toLocaleDateString('en-GB', { day: '2-digit', timeZone: 'Europe/London' })}</b>
          <span>
            {date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Europe/London' })}
          </span>
        </div>
      </div>
      <div className="event-copy">
        <span className="micro">
          {e.genre} ·{' '}
          {date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/London',
          })}
        </span>
        <h3>
          {e.title}
          <ArrowUpRight size={20} />
        </h3>
        <p>
          {e.sample
            ? 'Sample programme · Entry information'
            : e.free
              ? 'Official programme · Free entry'
              : 'Official programme · See event details'}
        </p>
      </div>
    </button>
  );
}
function Modal({
  title,
  onClose,
  children,
  side = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  side?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const last = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const els = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input,select,textarea,a[href],summary',
          ),
        );
        const first = els[0],
          last = els.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      last?.focus();
    };
  }, []);
  return (
    <div
      className={'modal-backdrop ' + (side ? 'side' : '')}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function download(name: string, data: any) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function RenéSnapshot({ rewards, user }: { rewards: any; user: any }) {
  if (!rewards) return null;
  return (
    <div className="rene-snapshot">
      <div className="points-tile">
        <div className="eyebrow">YOUR RENÉ POINTS</div>
        <strong>{rewards.points}</strong>
        <span>René Points</span>
        <small>
          {user.id === 'daniel' ? 'Daniel Woolf · sample member balance' : 'Rewards balance'} ·
          eligible food only
        </small>
      </div>
      <div className="stamp-tile">
        <div className="eyebrow">THE KITCHEN CLUB</div>
        <h3>A little stamp. A lovely treat.</h3>
        <div className="stamp-row">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={i < (rewards.stampCard?.stamps || 0) ? 'filled' : ''}>
              {i < (rewards.stampCard?.stamps || 0) ? '✦' : i + 1}
            </span>
          ))}
        </div>
        <p>
          {rewards.stampCard?.stamps || 0} / 6 food-visit stamps · £5 off eligible food after six
          separate food-visit days.
        </p>
        <small>
          Sample promotion. Drinks don’t earn food stamps. Eligibility checked by the server.
        </small>
      </div>
      <div className="reward-mini">
        <div className="eyebrow">READY WHEN YOU ARE</div>
        {rewards.offers
          .filter((o: any) => o.eligible)
          .map((o: any) => (
            <div key={o.id}>
              <b>✦ {o.name}</b>
              <p>{o.description}</p>
            </div>
          ))}
        <small>Open the Rewards tab to use an eligible offer at checkout.</small>
      </div>
    </div>
  );
}

function Account({
  user,
  setUser,
  run,
  toast,
  onBook,
  order,
  rewards,
}: {
  user: any;
  setUser: (u: any) => void;
  run: any;
  toast: any;
  onBook: () => void;
  order: any;
  rewards: any;
}) {
  const [orders, setOrders] = useState<any[]>([]),
    [bookings, setBookings] = useState<any>(null),
    [prefs, setPrefs] = useState(user.preferences),
    [history, setHistory] = useState<any>(null);
  useEffect(() => {
    void run(async () => {
      setOrders(await api('/orders'));
      setHistory(await api('/history'));
      setBookings(await api('/bookings'));
    });
  }, [user, order]);
  return (
    <div className="account-grid">
      <div className="account-wide">
        <RenéSnapshot rewards={rewards} user={user} />
        <CircleHub key={user.id} user={user} run={run} toast={toast} />
      </div>
      <div>
        <div className="panel">
          <div className="eyebrow">WELCOME BACK</div>
          <h2>{user.name}</h2>
          <p className="muted">{nice(user.role)} account · Sample history</p>
        </div>
        <div className="panel">
          <h3>What you ate & drank</h3>
          <p className="muted">
            {user.id === 'daniel'
              ? 'Sample history — these are examples, not Daniel’s actual purchases.'
              : 'Your order history. Sample transactions are labelled.'}
          </p>
          {history?.orders.map((o: any) => (
            <details className="history-visit" key={o.id}>
              <summary>
                {new Date(o.created_at).toLocaleDateString('en-GB', {
                  timeZone: 'Europe/London',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {money(o.total)} · {nice(o.status)}
              </summary>
              {o.items.map((i: any) => (
                <div className="list-row" key={i.id}>
                  <span>
                    {i.quantity} × {i.name}
                  </span>
                  <b>{money(i.unit_price * i.quantity)}</b>
                </div>
              ))}
            </details>
          ))}
          <h3 style={{ marginTop: 30 }}>Orders & receipts</h3>
          {orders.length ? (
            orders.map((o) => (
              <div key={o.id} className="list-row">
                <div>
                  <b>#{o.id.slice(0, 8)}</b>
                  <small>
                    {nice(o.status)} · {o.payment}
                  </small>
                </div>
                <button
                  className="text-link"
                  onClick={() =>
                    void run(async () =>
                      download('rene-receipt.json', await api('/orders/' + o.id)),
                    )
                  }
                >
                  {money(o.total)} <Download size={15} />
                </button>
              </div>
            ))
          ) : (
            <p className="muted">Nothing ordered just yet.</p>
          )}
          <button
            className="outline"
            onClick={() =>
              void run(async () => {
                const r = JSON.parse(sessionStorage.getItem('rene-receipt') || '{}');
                if (!r.id || !r.secret)
                  throw Error('No guest receipt found in this browser session.');
                toast((await api('/orders/' + r.id + '/claim', 'POST', {}, r.secret)).message);
                setOrders(await api('/orders'));
              })
            }
          >
            Link my guest receipt securely
          </button>
        </div>
        <div className="panel">
          <h3>Bookings & tickets</h3>
          {bookings?.bookings.map((b: any) => (
            <div className="list-row" key={b.id}>
              {new Date(b.data.date).toLocaleString('en-GB')} · {b.data.party} guests{' '}
              <span className="pill">{b.status}</span>
            </div>
          ))}
          {bookings?.tickets.map((t: any) => (
            <div key={t.id} className="list-row">
              <span>
                Example ticket · {t.event_id}
                <small>Single use · {t.used_at ? 'Checked in' : 'Not used'}</small>
              </span>
              <code>{t.id}</code>
            </div>
          ))}
          <p className="muted">
            Requests require confirmation. Mock tickets do not grant real admission.
          </p>
          <button className="outline" onClick={onBook}>
            Request a table <Plus size={16} />
          </button>
        </div>
      </div>
      <div>
        <div className="panel">
          <h3>Make it yours</h3>
          <p className="muted">
            You choose what you hear from us. Marketing delivery is not connected.
          </p>
          {[
            ['personalisation', 'Personalised recommendations'],
            ['email', 'Email marketing'],
            ['push', 'Push marketing'],
            ['location', 'Location-assisted arrival (foreground only)'],
          ].map(([key, label]) => (
            <label className="check-row" key={key}>
              <input
                type="checkbox"
                checked={!!prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
          <h4>Your interests</h4>
          <div className="chips">
            {[...eventGenres, 'Food'].map((g) => (
              <button
                key={g}
                className={prefs.interests?.includes(g) ? 'selected' : ''}
                onClick={() =>
                  setPrefs({
                    ...prefs,
                    interests: prefs.interests?.includes(g)
                      ? prefs.interests.filter((x: string) => x !== g)
                      : [...prefs.interests, g],
                  })
                }
              >
                {g}
              </button>
            ))}
          </div>
          <button
            className="primary"
            onClick={() =>
              void run(async () => {
                setUser(await api('/preferences', 'PUT', prefs));
                toast('Preferences saved with consent version and timestamp.');
              })
            }
          >
            Save preferences <Check size={16} />
          </button>
        </div>
        <div className="panel">
          <h3>Your data, your choice</h3>
          <p className="muted">
            Precise location stays on your device and is never sent to this API. Purchase and visit
            records support your rewards.
          </p>
          <button
            className="outline full"
            onClick={() =>
              void run(async () => download('rene-data-export.json', await api('/privacy/export')))
            }
          >
            <Download size={16} />
            Export my data
          </button>
          <details className="delete-account">
            <summary>Delete my account</summary>
            <p>
              Account data will be deleted; anonymised transactions remain. This cannot be undone.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                void run(async () => {
                  await api('/privacy/account', 'DELETE', { confirm: d.get('confirm') });
                  await api('/auth/logout', 'POST', {});
                  setUser(null);
                  toast('Account deleted');
                });
              }}
            >
              <input name="confirm" placeholder="Type DELETE" required />
              <button className="danger">Delete account</button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}
function Staff({
  user,
  boot,
  refresh,
  run,
  toast,
  onLogin,
}: {
  user: any;
  boot: any;
  refresh: () => Promise<void>;
  run: any;
  toast: any;
  onLogin: () => void;
}) {
  const [view, setView] = useState('Live orders'),
    [queue, setQueue] = useState<any>({ orders: [], alerts: [] }),
    [overview, setOverview] = useState<any>(null),
    [tables, setTables] = useState<any[]>([]),
    [qr, setQr] = useState(''),
    [content, setContent] = useState<any[]>([]),
    [campaigns, setCampaigns] = useState<any[]>([]),
    [audit, setAudit] = useState<any[]>([]),
    [customers, setCustomers] = useState<any[]>([]),
    [customerQuery, setCustomerQuery] = useState(''),
    [selectedOrder, setSelectedOrder] = useState<any>(null),
    [tableQR, setTableQR] = useState<any>(null),
    [preview, setPreview] = useState<any>(null),
    [catalogue, setCatalogue] = useState<any>(null),
    [age, setAge] = useState(false);
  const manager = user && ['manager', 'admin'].includes(user.role);
  const load = async () => {
    if (!user || user.role === 'customer') return;
    setQueue(await api('/staff/queue'));
    if (view === 'Tables & check-in') {
      setTables(await api('/staff/tables'));
      setQr((await api('/staff/checkin-qr')).ref);
    }
    if (manager) {
      if (['Overview', 'Integrations', 'Bookings', 'Menu & hours'].includes(view))
        setOverview(await api('/manager/overview'));
      if (view === 'Content review') setContent(await api('/manager/content'));
      if (view === 'Campaigns') setCampaigns(await api('/manager/campaigns'));
      if (view === 'Events & rewards') setCatalogue(await api('/manager/catalogue'));
      if (view === 'Audit log') setAudit(await api('/manager/audit'));
    }
  };
  useEffect(() => {
    void run(load);
    const timer = setInterval(() => {
      if (view === 'Live orders') load().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [user, view]);
  const act = async (fn: () => Promise<any>) =>
    run(async () => {
      await fn();
      await load();
    });
  if (!user || user.role === 'customer')
    return (
      <div className="section empty">
        <ShieldCheck size={45} />
        <h1>The team’s corner.</h1>
        <p>Staff credentials are required. Customer accounts cannot access operational data.</p>
        <button className="primary" onClick={onLogin}>
          Sign in as staff
        </button>
      </div>
    );
  const views = manager
    ? [
        'Overview',
        'Live orders',
        'Menu & hours',
        'Tables & check-in',
        'Customers & challenges',
        'Events & rewards',
        'Bookings',
        'Campaigns',
        'Integrations',
        'Content review',
        'Audit log',
      ]
    : ['Live orders', 'Tables & check-in', 'Customers & challenges'];
  return (
    <div className="staff-layout">
      <aside>
        <div className="eyebrow">THE WORKSPACE</div>
        <h3>Behind the bar.</h3>
        {views.map((v) => (
          <button className={view === v ? 'selected' : ''} key={v} onClick={() => setView(v)}>
            {v}
            {v === 'Live orders' && <span>{queue.orders.length}</span>}
          </button>
        ))}
        <div className="staff-identity">
          <ShieldCheck size={18} />
          <div>
            {user.name}
            <small>{user.role} · Staff workspace</small>
          </div>
        </div>
      </aside>
      <div className="staff-main">
        <div className="page-title">
          <div>
            <div className="eyebrow">CAFÉ RENÉ · OPERATIONS</div>
            <h1>{view}.</h1>
          </div>
          <button className="outline" onClick={() => void run(load)}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {view === 'Overview' && overview && (
          <>
            <div className="metrics">
              {[
                ['Recorded sales', money(Number(overview.sales.sales))],
                ['Recorded refunds', money(Number(overview.sales.refunds))],
                ['Orders', overview.sales.orders],
                ['Need attention', queue.alerts.length],
              ].map(([name, val]) => (
                <div className="metric" key={name}>
                  <span>{name}</span>
                  <strong>{val}</strong>
                  <small>Sample records</small>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Today behind the bar.</h2>
              <p>
                Mock payments and mock POS are active. Customers see “accepted” only after an
                explicit staff action.
              </p>
              <button className="primary" onClick={() => setView('Live orders')}>
                Open order queue <ArrowRight size={17} />
              </button>
            </div>
            <h3>Sales & reconciliation</h3>
            <div className="data-table">
              {overview.orders.length ? (
                overview.orders.map((o: any) => (
                  <div className="list-row" key={o.id}>
                    <code>#{o.id.slice(0, 8)}</code>
                    <span>{nice(o.status)}</span>
                    <span>{o.payment}</span>
                    <b>{money(o.total)}</b>
                    {o.payment === 'paid' && (
                      <button
                        className="danger"
                        onClick={() =>
                          void act(async () => {
                            await api('/staff/orders/' + o.id + '/refund', 'POST', {});
                            toast('Mock refund recorded. Rewards reversed where applicable.');
                          })
                        }
                      >
                        Mock refund & cancel
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="muted">Place your first order preview in the customer app.</p>
              )}
            </div>
          </>
        )}
        {view === 'Live orders' && (
          <>
            {queue.alerts.map((a: any) => (
              <div className="integration-alert" key={a.id}>
                <AlertCircle />
                <div>
                  <b>Paid but not delivered to POS · #{a.order_id.slice(0, 8)}</b>
                  <p>
                    {a.last_error} · {a.attempts} attempts. Customer payment is confirmed;
                    fulfilment awaits resolution.
                  </p>
                </div>
                {manager && (
                  <button
                    className="primary"
                    onClick={() =>
                      void act(() => api('/staff/jobs/retry', 'POST', { orderId: a.order_id }))
                    }
                  >
                    Retry delivery
                  </button>
                )}
                {manager && (
                  <button
                    className="danger"
                    onClick={() =>
                      void act(() => api('/staff/orders/' + a.order_id + '/refund', 'POST', {}))
                    }
                  >
                    Refund & cancel
                  </button>
                )}
              </div>
            ))}
            <div className="queue-grid">
              {['awaiting_acceptance', 'accepted', 'preparing', 'ready'].map((status) => (
                <section className="queue-column" key={status}>
                  <div className="column-title">
                    <h3>{nice(status)}</h3>
                    <span>{queue.orders.filter((o: any) => o.status === status).length}</span>
                  </div>
                  {queue.orders
                    .filter((o: any) => o.status === status)
                    .map((o: any) => (
                      <div className="queue-card" key={o.id}>
                        <div className="list-row">
                          <b>{o.collection ? 'Collection' : nice(o.table_id || '')}</b>
                          <span>
                            {Math.max(
                              0,
                              Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000),
                            )}
                            m
                          </span>
                        </div>
                        <small>
                          #{o.id.slice(0, 8)} · {money(o.total)} · SIMULATED PAYMENT
                        </small>
                        {o.alcohol && (
                          <p className="gold">
                            Age verification {o.age_checked ? '✓' : 'required'}
                          </p>
                        )}
                        <p>{o.notes || 'No kitchen notes'}</p>
                        <span className={'pill ' + (!o.pos_ref ? 'warning' : '')}>
                          {o.pos_ref ? 'Delivered to mock POS' : 'POS delivery pending'}
                        </span>
                        <button
                          className="outline full"
                          onClick={() =>
                            void run(async () => {
                              setAge(false);
                              setSelectedOrder(await api('/orders/' + o.id));
                            })
                          }
                        >
                          Review & {nice(nextStatus[o.status])}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                </section>
              ))}
            </div>
            {queue.orders.length === 0 && (
              <div className="empty">
                <UtensilsCrossed size={35} />
                <h2>A quiet moment.</h2>
                <p>New simulated paid orders appear here automatically.</p>
              </div>
            )}
          </>
        )}
        {view === 'Menu & hours' && (
          <>
            <div className="panel">
              <h3>Ordering controls</h3>
              {overview && (
                <>
                  <div className="button-row">
                    {[
                      ['open', 'Ordering enabled'],
                      ['collection', 'Collection enabled'],
                      ['enforceHours', 'Enforce London kitchen hours'],
                    ].map(([key, label]) => (
                      <label className="check-row" key={key}>
                        <input
                          type="checkbox"
                          checked={overview.ordering[key]}
                          onChange={(e) =>
                            void act(async () => {
                              await api('/manager/ordering', 'PUT', {
                                ...overview.ordering,
                                [key]: e.target.checked,
                              });
                              await refresh();
                            })
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="muted">
                    Kitchen hours: Mon–Sat 11–20; Sun 11–17, Europe/London. Ordering currently uses
                    all-day ordering. Published venue hours require review.
                  </p>
                  <details>
                    <summary>Location-assisted arrival settings</summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const d = new FormData(e.currentTarget);
                        void act(() =>
                          api('/manager/ordering', 'PUT', {
                            ...overview.ordering,
                            coordinates: {
                              latitude: Number(d.get('latitude')),
                              longitude: Number(d.get('longitude')),
                            },
                            radius: Number(d.get('radius')),
                            dwellSeconds: Number(d.get('dwell')),
                          }),
                        );
                      }}
                    >
                      <label>
                        Verified venue latitude
                        <input
                          type="number"
                          step="any"
                          name="latitude"
                          required
                          defaultValue={overview.ordering.coordinates?.latitude}
                        />
                      </label>
                      <label>
                        Verified venue longitude
                        <input
                          type="number"
                          step="any"
                          name="longitude"
                          required
                          defaultValue={overview.ordering.coordinates?.longitude}
                        />
                      </label>
                      <label>
                        Radius (20–300 metres)
                        <input
                          type="number"
                          name="radius"
                          min="20"
                          max="300"
                          defaultValue={overview.ordering.radius}
                        />
                      </label>
                      <label>
                        Dwell seconds (15–120)
                        <input
                          type="number"
                          name="dwell"
                          min="15"
                          max="120"
                          defaultValue={overview.ordering.dwellSeconds}
                        />
                      </label>
                      <button className="outline">Save arrival settings</button>
                    </form>
                  </details>
                </>
              )}
            </div>
            <div className="panel">
              <h3>Menu review</h3>
              <p className="muted">
                Prices were transcribed from the official MainMenu26 PDF. No item is approved for
                live ordering. Allergen review is still required.
              </p>
              {boot.menu.map((m: MenuItem) => (
                <form
                  className="menu-review list-row"
                  key={m.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    void act(async () => {
                      await api('/manager/menu/' + m.id, 'PUT', {
                        price: Math.round(Number(d.get('price')) * 100),
                        available: d.get('available') === 'on',
                        approved: d.get('approved') === 'on',
                      });
                      await refresh();
                      toast('Menu review saved');
                    });
                  }}
                >
                  <span>{m.name}</span>
                  <label className="inline-label">
                    £
                    <input
                      aria-label={'Price for ' + m.name}
                      type="number"
                      step=".01"
                      min="0"
                      name="price"
                      defaultValue={(m.price / 100).toFixed(2)}
                      required
                    />
                  </label>
                  <label className="check-row">
                    <input name="available" type="checkbox" defaultChecked={m.available} />
                    Available
                  </label>
                  <label className="check-row">
                    <input name="approved" type="checkbox" defaultChecked={m.approved} />
                    Price reviewed
                  </label>
                  <button className="outline">Save</button>
                </form>
              ))}
            </div>
          </>
        )}
        {view === 'Tables & check-in' && (
          <>
            <div className="panel venue-qr">
              <div>
                <div className="eyebrow">ROTATING VENUE CHECK-IN</div>
                <h2>Here for the evening.</h2>
                <p>
                  Expires in two minutes. Refresh to rotate. Scanning verifies one visit per London
                  day.
                </p>
                <button
                  className="outline"
                  onClick={() => void act(async () => setQr((await api('/staff/checkin-qr')).ref))}
                >
                  <RefreshCw size={16} />
                  Rotate QR
                </button>
                <button
                  className="text-link"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(qr)
                      .then(() => toast('Check-in reference copied'))
                      .catch(() => toast('Select and copy the reference below'));
                  }}
                >
                  Copy reference
                </button>
                <textarea readOnly value={qr} aria-label="Rotating check-in reference" />
              </div>
              {qr && <QR value={'caferene://checkin?ref=' + encodeURIComponent(qr)} />}
            </div>
            <div className="tables-grid">
              {tables.map((t) => (
                <div className="panel" key={t.id}>
                  <h3>{t.label}</h3>
                  <span className="pill">
                    {t.enabled ? 'Active' : 'Disabled'} · Version {t.version}
                  </span>
                  <button className="outline full" onClick={() => setTableQR(t)}>
                    <QrCode size={18} />
                    Show table QR
                  </button>
                  {manager && (
                    <button
                      className="text-link"
                      onClick={() =>
                        void act(() =>
                          api('/staff/tables/' + t.id, 'POST', { enabled: !t.enabled }),
                        )
                      }
                    >
                      {t.enabled ? 'Disable & revoke QR' : 'Enable table'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {view === 'Customers & challenges' && (
          <>
            <div className="panel">
              <h3>Find a customer</h3>
              <p className="muted">
                Name or exact email. Staff receive the account identifier and display name only.
              </p>
              <form
                className="button-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () =>
                    setCustomers(
                      await api('/staff/customers?q=' + encodeURIComponent(customerQuery)),
                    ),
                  );
                }}
              >
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customer"
                />
                <button className="primary">
                  <Search size={17} />
                  Find
                </button>
              </form>
              {customers.map((c) => (
                <form
                  className="list-row"
                  key={c.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    void act(async () => {
                      await api('/staff/validate', 'POST', {
                        userId: c.id,
                        kind: d.get('kind'),
                        reference: d.get('reference'),
                      });
                      toast(
                        'Verification recorded. Duplicate references cannot earn extra credit.',
                      );
                    });
                  }}
                >
                  <b>{c.name}</b>
                  <select name="kind" aria-label="Challenge type">
                    {['visit', 'music', 'quiz', 'festival', 'history'].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                  <input
                    name="reference"
                    placeholder="Event / clue / day reference"
                    required
                    maxLength={80}
                  />
                  <button className="outline">Verify</button>
                </form>
              ))}
            </div>
            <div className="panel">
              <h3>Single-use ticket check-in</h3>
              <form
                className="button-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void act(async () => {
                    await api('/staff/tickets/' + d.get('ticket') + '/checkin', 'POST', {});
                    toast('Ticket checked in. Reuse will be rejected.');
                  });
                }}
              >
                <input name="ticket" placeholder="Example ticket ID" required />
                <button className="primary">Check in</button>
              </form>
            </div>
          </>
        )}
        {view === 'Bookings' && overview && (
          <div className="panel">
            <h3>Reservation requests</h3>
            <p className="muted">
              No booking system is connected. Confirming here updates the request record only.
            </p>
            {overview.bookings.map((b: any) => (
              <div className="list-row" key={b.id}>
                <div>
                  <b>
                    {new Date(b.data.date).toLocaleString('en-GB', { timeZone: 'Europe/London' })}
                  </b>
                  <small>
                    {b.data.party} guests · {b.data.notes}
                  </small>
                </div>
                <span className="pill">{b.status}</span>
                <button
                  className="outline"
                  onClick={() =>
                    void act(() =>
                      api('/manager/bookings/' + b.id, 'POST', { status: 'confirmed' }),
                    )
                  }
                >
                  Confirm request
                </button>
                <button
                  className="text-link"
                  onClick={() =>
                    void act(() => api('/manager/bookings/' + b.id, 'POST', { status: 'declined' }))
                  }
                >
                  Decline
                </button>
              </div>
            ))}
            {!overview.bookings.length && <p>No requests yet.</p>}
          </div>
        )}
        {view === 'Integrations' && overview && (
          <>
            <div className="panel integration-plan">
              <div className="eyebrow">YOUR VENUE’S EPOS</div>
              <h3>TouchOffice Web · supplied by Eposbuddy</h3>
              <p>
                Supplier identified. Order delivery is still simulated; no credentials or live till
                connection are configured.
              </p>
              <ul>
                {overview.integrations.plan?.requirements.map((r: string) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <a
                className="text-link"
                href="https://www.eposbuddy.com/"
                target="_blank"
                rel="noreferrer"
              >
                Eposbuddy ↗
              </a>
            </div>
            <div className="metrics">
              <div className="metric">
                <span>Payments</span>
                <strong>Mock</strong>
                <small>Signed simulated provider webhooks</small>
              </div>
              <div className="metric">
                <span>Point of sale</span>
                <strong>Mock</strong>
                <small>Idempotent reference · staff acceptance</small>
              </div>
              <div className="metric">
                <span>Real integrations</span>
                <strong>Off</strong>
                <small>Bar tabs & split payments disabled</small>
              </div>
            </div>
            <div className="panel">
              <h3>Exercise recovery</h3>
              <p>
                Fail the next mock POS submission, then place and simulate payment for an order. It
                will enter the paid-but-unsent recovery queue.
              </p>
              <div className="button-row">
                <button
                  className="outline"
                  onClick={() =>
                    void act(async () =>
                      toast((await api('/staff/demo/fail-pos', 'POST', {})).message),
                    )
                  }
                >
                  Fail next POS delivery
                </button>
                <button
                  className="primary"
                  onClick={() => void act(() => api('/staff/jobs/run', 'POST', {}))}
                >
                  Process pending jobs
                </button>
              </div>
            </div>
            <div className="panel">
              <h3>Delivery attempts</h3>
              {overview.integrations.attempts.map((a: any) => (
                <div className="list-row" key={a.id}>
                  <code>{a.order_id.slice(0, 8)}</code>
                  <span>{a.success ? 'Delivered' : 'Failed'}</span>
                  <small>{a.message}</small>
                </div>
              ))}
            </div>
          </>
        )}
        {view === 'Content review' && (
          <>
            <SocialRefresh act={act} toast={toast} />
            <MediaUpload act={act} toast={toast} />
            <div className="panel">
              <h3>Bring the real René in.</h3>
              <p>
                Facebook required login and Instagram was throttled. Paste authorised content or CSV
                below; URLs are stored as references and never fetched automatically. Upload an
                authorised image below, or store its source URL as a reference.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    d = new FormData(form);
                  void act(async () => {
                    await api('/manager/content', 'POST', Object.fromEntries(d));
                    form.reset();
                    toast('Imported into the review queue. Nothing published automatically.');
                  });
                }}
              >
                <div className="form-grid">
                  <label>
                    Title
                    <input name="title" required maxLength={160} />
                  </label>
                  <label>
                    Source URL
                    <input name="url" type="url" />
                  </label>
                  <label>
                    Format
                    <select name="type">
                      <option value="text">Pasted content</option>
                      <option value="csv">Pasted CSV</option>
                      <option value="image-reference">Image URL reference</option>
                    </select>
                  </label>
                  <label>
                    Publication / event date
                    <input name="publicationDate" type="date" />
                  </label>
                </div>
                <label>
                  Content / CSV / asset URL
                  <textarea name="text" required rows={5} maxLength={20000} />
                </label>
                <label>
                  Reuse permission
                  <select name="permission">
                    <option value="unknown">Unknown — approval required</option>
                    <option value="authorised">I confirm reuse is authorised</option>
                  </select>
                </label>
                <button className="primary">
                  Import for review <Plus size={16} />
                </button>
              </form>
            </div>
            <div className="panel">
              <h3>Review queue</h3>
              {content.map((c) => (
                <div className="content-review" key={c.id}>
                  <div className="list-row">
                    <h3>{c.data.title}</h3>
                    <span className="pill">{nice(c.status)}</span>
                  </div>
                  <p className="muted">
                    {c.data.url || 'Manual import'} · {c.data.retrievedAt} · Permission:{' '}
                    {c.data.permission || 'unknown'}
                  </p>
                  {c.data.previewUrl && (
                    <img
                      src={c.data.previewUrl}
                      alt={c.data.title}
                      style={{ maxWidth: 320, width: '100%', maxHeight: 250, objectFit: 'contain' }}
                    />
                  )}
                  {c.data.type === 'image' &&
                    c.status === 'approved' &&
                    c.data.permission === 'authorised' && (
                      <p className="source-note">
                        Approved image URL: <code>{'/api/media/' + c.id}</code> · use as imageUrl on
                        an event.
                      </p>
                    )}
                  <pre>{c.data.text}</pre>
                  {['social', 'text'].includes(c.data.type) && (
                    <PublishSocialEvent record={c} act={act} toast={toast} />
                  )}
                  <div className="button-row">
                    <button
                      className="outline"
                      onClick={() =>
                        void act(() =>
                          api('/manager/content/' + c.id + '/review', 'POST', {
                            status: 'approved',
                          }),
                        )
                      }
                    >
                      Approve review record
                    </button>
                    <button
                      className="text-link"
                      onClick={() =>
                        void act(() =>
                          api('/manager/content/' + c.id + '/review', 'POST', {
                            status: 'rejected',
                          }),
                        )
                      }
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {view === 'Campaigns' && (
          <>
            <div className="panel">
              <h3>A good reason to come back.</h3>
              <p>
                Rule-based audiences. Personalisation and channel consent are required. Quiet hours:
                9pm–9am London. Frequency cap: two per seven days. Launch schedules a simulation; no
                messages are sent.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const d = new FormData(e.currentTarget);
                  void act(async () => {
                    const c = await api('/manager/campaigns', 'POST', {
                      name: d.get('name'),
                      interest: d.get('interest'),
                      channel: d.get('channel'),
                      offerId: d.get('offerId'),
                      budget: Math.round(Number(d.get('budget')) * 100),
                      limit: Number(d.get('limit')),
                      schedule: new Date(String(d.get('schedule'))).toISOString(),
                      approved: d.get('approved') === 'on',
                    });
                    setPreview(await api('/manager/campaigns/' + c.id + '/preview'));
                  });
                }}
              >
                <div className="form-grid">
                  <label>
                    Campaign name
                    <input name="name" required maxLength={80} />
                  </label>
                  <label>
                    Audience interest
                    <select name="interest">
                      <option value="">All opted-in customers</option>
                      {[...eventGenres, 'Food'].map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Channel
                    <select name="channel">
                      <option value="email">Email</option>
                      <option value="push">Push</option>
                    </select>
                  </label>
                  <label>
                    Sample offer
                    <select name="offerId">
                      <option value="welcome">£2 food welcome</option>
                      <option value="regular-treat">Regular’s £5 reward</option>
                    </select>
                  </label>
                  <label>
                    Discount budget (£)
                    <input
                      type="number"
                      name="budget"
                      min="0"
                      step=".01"
                      defaultValue="100"
                      required
                    />
                  </label>
                  <label>
                    Maximum recipients
                    <input
                      type="number"
                      name="limit"
                      min="1"
                      max="10000"
                      defaultValue="50"
                      required
                    />
                  </label>
                  <label>
                    Schedule · your local time
                    <input type="datetime-local" name="schedule" required />
                  </label>
                </div>
                <label className="check-row">
                  <input type="checkbox" name="approved" required />I have reviewed the audience,
                  offer and limits. Approve scheduling.
                </label>
                <button className="primary">
                  Save & preview audience <ArrowRight size={16} />
                </button>
              </form>
            </div>
            {campaigns.map((c) => (
              <div className="panel list-row" key={c.id}>
                <div>
                  <h3>{c.data.name}</h3>
                  <span className="pill">{nice(c.status)}</span>
                </div>
                <button
                  className="outline"
                  onClick={() =>
                    void run(async () =>
                      setPreview(await api('/manager/campaigns/' + c.id + '/preview')),
                    )
                  }
                >
                  Preview & results
                </button>
                <button
                  className="text-link"
                  onClick={() =>
                    void act(() => api('/manager/campaigns/' + c.id + '/pause', 'POST', {}))
                  }
                >
                  Pause
                </button>
              </div>
            ))}
          </>
        )}
        {view === 'Events & rewards' && catalogue && (
          <Catalogue data={catalogue} act={act} toast={toast} />
        )}
        {view === 'Audit log' && (
          <div className="panel">
            {audit.map((a) => (
              <div className="list-row audit-row" key={a.id}>
                <small>{new Date(a.created_at).toLocaleString('en-GB')}</small>
                <b>{a.action}</b>
                <code>{a.reference}</code>
                <span>{a.actor}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {selectedOrder && (
        <Modal
          title={'Order #' + selectedOrder.id.slice(0, 8)}
          onClose={() => setSelectedOrder(null)}
        >
          {selectedOrder.items.map((i: any) => (
            <div className="list-row" key={i.id}>
              <span>
                {i.quantity} × {i.name}
                <small>{i.modifiers.map((m: any) => m.name).join(', ')}</small>
              </span>
              <b>{money(i.unit_price * i.quantity)}</b>
            </div>
          ))}
          <p>{selectedOrder.notes || 'No kitchen notes'}</p>
          {selectedOrder.alcohol && !selectedOrder.age_checked && (
            <label className="check-row">
              <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} />I
              have checked acceptable proof of age in person.
            </label>
          )}
          <p className="muted">
            Paid: {money(selectedOrder.total)} ·{' '}
            {selectedOrder.pos_ref ? 'Mock POS delivery complete' : 'Waiting for POS delivery'}
          </p>
          <button
            className="primary full"
            disabled={
              !selectedOrder.pos_ref ||
              (selectedOrder.alcohol && !selectedOrder.age_checked && !age)
            }
            onClick={() =>
              void act(async () => {
                await api('/staff/orders/' + selectedOrder.id + '/progress', 'POST', {
                  status: nextStatus[selectedOrder.status],
                  ageChecked: age,
                });
                setSelectedOrder(null);
                toast('Order updated');
              })
            }
          >
            Mark {nice(nextStatus[selectedOrder.status])}
            <Check size={17} />
          </button>
        </Modal>
      )}
      {tableQR && (
        <Modal title={tableQR.label + ' · Ordering QR'} onClose={() => setTableQR(null)}>
          <QR value={location.origin + '/?table=' + encodeURIComponent(tableQR.ref)} />
          <p>
            Signed table reference. Expires in 24 hours; regenerate after expiry. Revoking a table
            invalidates existing QR codes.
          </p>
          <a className="primary" href={'/?table=' + encodeURIComponent(tableQR.ref)}>
            Open browser ordering <ArrowUpRight size={16} />
          </a>
          <p>
            <a href={'caferene://order?table=' + encodeURIComponent(tableQR.ref)}>
              Open in installed app ↗
            </a>
          </p>
        </Modal>
      )}
      {preview && (
        <Modal title={preview.data.name + ' · Preview'} onClose={() => setPreview(null)}>
          <div className="metrics">
            <div className="metric">
              <span>Eligible</span>
              <strong>{preview.eligible}</strong>
            </div>
            <div className="metric">
              <span>Sent</span>
              <strong>0</strong>
            </div>
          </div>
          <p>{preview.notice}</p>
          <p>Discount cost £0 · Attributed sales £0 · Redemptions 0 · Repeat visits 0</p>
          <button
            className="primary"
            onClick={() =>
              void act(async () => {
                const r = await api('/manager/campaigns/' + preview.id + '/launch', 'POST', {});
                toast(r.message + ' Eligible audience: ' + r.eligible);
                setPreview(null);
              })
            }
          >
            Schedule campaign preview
          </button>
        </Modal>
      )}
    </div>
  );
}

function SocialRefresh({ act, toast }: { act: any; toast: any }) {
  const [status, setStatus] = useState<any>(null);
  useEffect(() => {
    api('/manager/social')
      .then(setStatus)
      .catch(() => {});
  }, []);
  return (
    <div className="panel">
      <div className="eyebrow">THE LATEST FROM RENÉ</div>
      <h3>Fresh from René, automatically.</h3>
      <button
        className="primary"
        onClick={() =>
          void act(async () => {
            const r = await api('/manager/content-refresh', 'POST', {});
            toast(
              r.skipped
                ? 'Refresh already in progress'
                : 'Website and connected social sources checked',
            );
          })
        }
      >
        Refresh website & connected socials
      </button>
      <div className="social-tools">
        <p>
          Facebook: {status?.facebook ? 'connected' : 'awaiting authorised connection'} · Instagram:{' '}
          {status?.instagram ? 'connected' : 'awaiting authorised connection'}. Imports read
          venue-owned posts only and hold them for review.
        </p>
        <button
          className="outline"
          onClick={() =>
            void act(async () => {
              const r = await api('/manager/social/refresh', 'POST', {});
              toast(
                r.message +
                  ' Imported: ' +
                  r.imported +
                  (r.errors.length ? ' · ' + r.errors.join('; ') : ''),
              );
            })
          }
        >
          <RefreshCw size={16} />
          Pull latest posts
        </button>
      </div>
      <p className="source-note">
        The official website is checked every 15 minutes while the server is running. Connected Meta
        accounts refresh on the same schedule. Public login restrictions are respected; post
        timestamps never become event dates automatically.
      </p>
    </div>
  );
}
function PublishSocialEvent({ record, act, toast }: { record: any; act: any; toast: any }) {
  return (
    <details>
      <summary>Review this post and publish an event</summary>
      <form
        className="publication-form"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void act(async () => {
            await api('/manager/events/social-' + record.id, 'PUT', {
              id: 'social-' + record.id,
              title: d.get('title'),
              genre: d.get('genre'),
              date: new Date(String(d.get('date'))).toISOString(),
              description: d.get('description'),
              free: d.get('free') === 'on',
              sample: false,
              sourceUrl: record.data.url,
              verifiedAt: new Date().toISOString(),
              approvedReview: d.get('approved') === 'on',
              ...(d.get('image')
                ? { imageUrl: d.get('image'), imageKind: 'authorised-photo' }
                : {}),
            });
            toast(
              'Reviewed event published. Past event dates are excluded from upcoming listings.',
            );
          });
        }}
      >
        <label>
          Event title
          <input name="title" required maxLength={100} />
        </label>
        <div className="form-grid">
          <label>
            Actual event date and time · your local time
            <input name="date" type="datetime-local" required />
          </label>
          <label>
            Genre
            <select name="genre">
              {eventGenres.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Concise event description
          <textarea name="description" required maxLength={500} />
        </label>
        <label>
          Approved uploaded image URL (optional)
          <input name="image" placeholder="/api/media/approved-image-id" />
        </label>
        <label className="check-row">
          <input name="free" type="checkbox" />
          The source explicitly confirms free entry
        </label>
        <label className="check-row">
          <input name="approved" type="checkbox" required />I have verified the source, event date,
          description and any image reuse permission.
        </label>
        <button className="primary">Publish reviewed event</button>
      </form>
    </details>
  );
}

function MediaUpload({ act, toast }: { act: any; toast: any }) {
  return (
    <div className="panel">
      <h3>Import an image for review</h3>
      <p>
        PNG, JPEG or WebP, under 800 KB. Images are decoded, resized to 1400px, stripped of metadata
        and saved as private WebP assets. Uploading does not publish them.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget,
            d = new FormData(form);
          const file = d.get('file') as File;
          void act(async () => {
            if (!file || file.size > 800000) throw Error('Choose an image under 800 KB.');
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            await api('/manager/media', 'POST', {
              title: d.get('title'),
              sourceUrl: d.get('sourceUrl'),
              permission: d.get('permission'),
              base64,
            });
            form.reset();
            toast('Optimised image stored privately for review');
          });
        }}
      >
        <div className="form-grid">
          <label>
            Image title
            <input name="title" required maxLength={160} />
          </label>
          <label>
            Original source URL
            <input name="sourceUrl" type="url" />
          </label>
        </div>
        <label>
          Image
          <input name="file" type="file" accept="image/png,image/jpeg,image/webp" required />
        </label>
        <label>
          Reuse permission
          <select name="permission">
            <option value="unknown">Unknown — approval required</option>
            <option value="authorised">I confirm reuse is authorised</option>
          </select>
        </label>
        <button className="primary">Upload for review</button>
      </form>
    </div>
  );
}

function Catalogue({ data, act, toast }: { data: any; act: any; toast: any }) {
  const [kind, setKind] = useState('events'),
    [selected, setSelected] = useState(''),
    [text, setText] = useState('');
  const choose = (type: string, id: string) => {
    setKind(type);
    setSelected(id);
    const value =
      type === 'challenges' ? data.challenges : data[type].find((v: any) => v.id === id);
    setText(JSON.stringify(value || {}, null, 2));
  };
  return (
    <>
      <div className="panel">
        <h3>Events, offers & challenge definitions</h3>
        <p>
          Manage events, offers and challenge definitions. Verified events require a source URL and
          approvedReview=true. Money values use integer pence; ordering and offers remain in
          simulation mode.
        </p>
        <div className="button-row">
          <select
            aria-label="Record type"
            value={kind}
            onChange={(e) => choose(e.target.value, '')}
          >
            <option value="events">Events</option>
            <option value="offers">Offers</option>
            <option value="challenges">Challenge definitions</option>
          </select>
          {kind !== 'challenges' && (
            <select
              aria-label="Record"
              value={selected}
              onChange={(e) => choose(kind, e.target.value)}
            >
              <option value="">Choose a record</option>
              {data[kind].map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.title || d.name}
                </option>
              ))}
            </select>
          )}
          <button
            className="outline"
            onClick={() => {
              if (kind === 'challenges') {
                choose(kind, '');
                return;
              }
              const sample =
                kind === 'events'
                  ? {
                      id: 'event-' + crypto.randomUUID().slice(0, 8),
                      title: 'New sample event',
                      genre: 'Blues',
                      date: new Date(Date.now() + 864e5).toISOString(),
                      description: 'Sample programme. Not a confirmed performance.',
                      sample: true,
                      free: true,
                    }
                  : {
                      id: 'offer-' + crypto.randomUUID().slice(0, 8),
                      name: 'New sample food offer',
                      description: 'Single-use offer.',
                      discount: 200,
                      min: 1000,
                      points: 0,
                      expires: new Date(Date.now() + 7 * 864e5).toISOString(),
                      sample: true,
                    };
              setText(JSON.stringify(sample, null, 2));
              setSelected(sample.id);
            }}
          >
            Load new example
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const value = JSON.parse(text);
              await api(
                kind === 'challenges' ? '/manager/challenges' : '/manager/' + kind + '/' + value.id,
                'PUT',
                value,
              );
              toast('Configuration saved and audited');
            });
          }}
        >
          <label style={{ marginTop: 20 }}>
            Record JSON
            <textarea
              rows={18}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              spellCheck={false}
              style={{ fontFamily: 'monospace', fontSize: 11 }}
            />
          </label>
          <button className="primary">Validate & save</button>
        </form>
      </div>
      <div className="panel">
        <h3>Loyalty adjustment</h3>
        <p>
          Manager-only, audited. Find the customer ID through customer lookup or use customer for
          the sample account.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            void act(async () => {
              await api('/manager/loyalty-adjustment', 'POST', {
                userId: d.get('userId'),
                points: Number(d.get('points')),
                reason: d.get('reason'),
              });
              toast('Loyalty adjustment recorded');
            });
          }}
        >
          <div className="form-grid">
            <label>
              Customer ID
              <input name="userId" defaultValue="customer" required />
            </label>
            <label>
              Points (+ or −)
              <input
                name="points"
                type="number"
                defaultValue="50"
                min="-10000"
                max="10000"
                required
              />
            </label>
          </div>
          <label>
            Reason
            <input name="reason" minLength={5} maxLength={150} required />
          </label>
          <button className="outline">Record adjustment</button>
        </form>
      </div>
      <div className="panel">
        <h3>Verification reversal controls</h3>
        <p>
          Removing an invalid verification recalculates challenge progress. The action remains in
          the audit log.
        </p>
        {[
          ...data.validations.map((v: any) => ({ ...v, type: 'validation' })),
          ...data.visits.map((v: any) => ({ ...v, type: 'visit' })),
        ].map((v: any) => (
          <div className="list-row" key={v.id}>
            <span>
              {v.user_id} · {v.kind || v.method}
            </span>
            <small>{v.reference || v.day}</small>
            <button
              className="danger"
              onClick={() =>
                void act(() =>
                  api('/manager/reverse-validation', 'POST', { id: v.id, type: v.type }),
                )
              }
            >
              Reverse
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function SocialLogo({ platform }: { platform: 'facebook' | 'instagram' }) {
  return (
    <svg className="social-logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={socialIconPaths[platform]} />
    </svg>
  );
}
