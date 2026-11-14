import React, { useEffect, useState } from 'react';
import { CheckCircle2, LockKeyhole, PlugZap } from 'lucide-react';

export function EposConnectionForm({ request, run, toast }: { request: any; run: any; toast: any }) {
  const [state, setState] = useState<any>(null);
  const [form, setForm] = useState({ provider: 'TouchOffice Web · Eposbuddy', endpoint: '', venueId: '', apiKey: '', handshakeSecret: '' });
  const load = async () => { const result = await request('/manager/epos-connection'); setState(result); setForm((f) => ({ ...f, provider: result.provider || f.provider, endpoint: result.endpoint || '', venueId: result.venueId || '' })); };
  useEffect(() => { void run(load); }, []);
  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  return <div className="panel epos-connect-panel">
    <div className="eyebrow"><PlugZap size={14} /> SECURE EPOS HANDSHAKE</div>
    <h3>Connect TouchOffice Web</h3>
    <p>Paste the endpoint, venue ID and handshake values supplied by Eposbuddy. Secrets are encrypted before storage and never returned to the browser after saving.</p>
    <div className="epos-form-grid">
      <label>Provider<input value={form.provider} onChange={(e) => update('provider', e.target.value)} /></label>
      <label>API endpoint<input type="url" placeholder="https://…" value={form.endpoint} onChange={(e) => update('endpoint', e.target.value)} /></label>
      <label>Venue / till ID<input value={form.venueId} onChange={(e) => update('venueId', e.target.value)} /></label>
      <label>API key<input type="password" autoComplete="new-password" value={form.apiKey} onChange={(e) => update('apiKey', e.target.value)} /></label>
      <label>Handshake secret<input type="password" autoComplete="new-password" value={form.handshakeSecret} onChange={(e) => update('handshakeSecret', e.target.value)} /></label>
    </div>
    <div className="button-row">
      <button className="primary" disabled={!form.endpoint || !form.venueId || !form.apiKey || !form.handshakeSecret} onClick={() => void run(async () => { const saved = await request('/manager/epos-connection', 'PUT', form); setState(saved); setForm((f) => ({ ...f, apiKey: '', handshakeSecret: '' })); toast('EPOS handshake saved securely.'); })}><LockKeyhole size={16} /> Save encrypted handshake</button>
      <button className="outline" disabled={!state?.configured} onClick={() => void run(async () => { const result = await request('/manager/epos-connection/test', 'POST', {}); setState((s: any) => ({ ...s, ...result })); toast(result.message); })}>Test connection</button>
    </div>
    {state && <div className="epos-status"><CheckCircle2 size={16} /><span>{state.status === 'ready' ? 'Ready for adapter activation' : state.configured ? 'Handshake saved' : 'Not configured'}</span>{state.lastTestAt && <small>Last tested {new Date(state.lastTestAt).toLocaleString('en-GB')}</small>}</div>}
  </div>;
}
