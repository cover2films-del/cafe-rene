import React, { useEffect, useState } from 'react';
import { RefreshCw, Users, PoundSterling, CalendarDays, Radio, Package } from 'lucide-react';
import { money } from '../../../packages/shared/src/index';

export function AdminDashboard({ request, run }: { request: any; run: any }) {
  const [data, setData] = useState<any>(null);
  const [queue, setQueue] = useState<any>({ orders: [], alerts: [] });
  const load = async () => {
    const [overview, live] = await Promise.all([request('/manager/overview'), request('/staff/queue')]);
    setData(overview);
    setQueue(live);
  };
  useEffect(() => {
    void run(load);
    const timer = setInterval(() => void load(), 10000);
    return () => clearInterval(timer);
  }, []);
  if (!data) return <section className="section"><p role="status">Loading manager dashboard…</p></section>;
  const available = data.stock.filter((s: any) => s.available).length;
  return (
    <main className="admin-dashboard">
      <div className="page-title">
        <div><div className="eyebrow">MANAGER VIEW · LIVE SNAPSHOT</div><h1>Admin.</h1></div>
        <button className="outline" onClick={() => void run(load)}><RefreshCw size={16} /> Refresh</button>
      </div>
      <div className="admin-live-banner"><Radio size={17} /><span>Auto-refreshing every 10 seconds · {data.integrations.provider}</span><b>DEMO CONNECTOR</b></div>
      <div className="admin-metrics">
        <div className="metric"><Users size={18} /><span>Customers</span><strong>{data.customers.total}</strong><small>Active member accounts</small></div>
        <div className="metric"><PoundSterling size={18} /><span>Recorded sales</span><strong>{money(Number(data.sales.sales))}</strong><small>{data.sales.orders} orders</small></div>
        <div className="metric"><CalendarDays size={18} /><span>Bookings</span><strong>{data.bookings.length}</strong><small>Requests and tickets</small></div>
        <div className="metric"><Radio size={18} /><span>Live EPOS queue</span><strong>{queue.orders.length}</strong><small>{queue.alerts.length} needs attention</small></div>
      </div>
      <div className="admin-grid">
        <section className="panel"><h2>Sales & live orders</h2>{queue.orders.slice(0, 8).map((o: any) => <div className="admin-row" key={o.id}><span><b>#{o.id.slice(0, 8)}</b><small>{o.status} · {o.payment}</small></span><strong>{money(o.total)}</strong></div>)}{!queue.orders.length && <p className="muted">No live orders right now.</p>}</section>
        <section className="panel"><h2>Bookings</h2>{data.bookings.slice(0, 6).map((b: any) => <div className="admin-row" key={b.id}><span><b>{b.data?.name || 'Table request'}</b><small>{b.data?.date || 'Date to confirm'} · {b.status}</small></span><span className="pill">{b.data?.party || '?'} guests</span></div>)}{!data.bookings.length && <p className="muted">No bookings yet.</p>}</section>
      </div>
      <section className="panel"><h2><Package size={19} /> Stock board</h2><p className="muted">Availability snapshot from the menu service. Touch/Eposbuddy stock sync can replace this feed when credentials are connected.</p><div className="stock-grid">{data.stock.slice(0, 18).map((s: any) => <div className={'stock-item ' + (s.available ? 'in-stock' : 'out-stock')} key={s.id}><span>{s.name}</span><b>{s.available ? 'Available' : 'Off sale'}</b></div>)}</div><small className="muted">{available} of {data.stock.length} menu products currently available · last sync {new Date(data.integrations.lastSync).toLocaleTimeString('en-GB')}</small></section>
    </main>
  );
}
