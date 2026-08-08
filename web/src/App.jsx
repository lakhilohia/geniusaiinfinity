import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const TABS = ['Find leads', 'Leads', 'Outreach', 'Services', 'Activity'];

export default function App() {
  const [tab, setTab] = useState('Find leads');
  const [status, setStatus] = useState(null);
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);

  const flash = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 4000); };

  const refreshLeads = useCallback(async () => {
    const { leads } = await api.leads();
    setLeads(leads);
  }, []);

  useEffect(() => {
    api.status().then(setStatus).catch(() => {});
    refreshLeads().catch(() => {});
  }, [refreshLeads]);

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Genius<span>AI</span> Infinity</div>
        <div className="subtitle">Lead Finder &amp; Service Outreach</div>
        {status && (
          <div className="badges">
            <Badge label="Data" value={status.dataMode === 'google_places' ? 'Google Places' : 'Demo data'} warn={status.dataMode !== 'google_places'} />
            <Badge label="AI writer" value={status.llmMode === 'llm' ? 'LLM' : 'Template'} />
            <Badge label="Email" value={status.emailMode.toUpperCase()} warn={status.emailMode !== 'live'} />
          </div>
        )}
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}{t === 'Leads' && leads.length ? ` (${leads.length})` : ''}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'Find leads' && <FindTab onDone={(m) => { refreshLeads(); flash(m); }} status={status} />}
        {tab === 'Leads' && (
          <LeadsTab leads={leads} selected={selected} toggle={toggle} setSelected={setSelected}
            refresh={refreshLeads} flash={flash} />
        )}
        {tab === 'Outreach' && (
          <OutreachTab leads={leads} selected={selected} status={status} refresh={refreshLeads} flash={flash} />
        )}
        {tab === 'Services' && <ServicesTab />}
        {tab === 'Activity' && <ActivityTab />}
      </main>

      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
      <footer className="foot">
        Use responsibly: contact only businesses you may lawfully reach, keep volumes small,
        and always honour unsubscribe requests.
      </footer>
    </div>
  );
}

function Badge({ label, value, warn }) {
  return <span className={`badge ${warn ? 'warn' : ''}`}>{label}: <b>{value}</b></span>;
}

// ── Find leads ────────────────────────────────────────────────────────────────
function FindTab({ onDone, status }) {
  const [query, setQuery] = useState('grocery shop');
  const [region, setRegion] = useState('Jaipur, India');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    setBusy(true);
    try {
      const r = await api.search(query, region);
      onDone(`Found ${r.found} businesses (${r.added} new) via ${r.mode === 'demo' ? 'demo data' : 'Google Places'}.`);
    } catch (e) { onDone(`Error: ${e.message}`); }
    setBusy(false);
  };

  const importCsv = async (file) => {
    const text = await file.text();
    try {
      const r = await api.importCsv(text);
      onDone(`Imported ${r.added} new leads from CSV.`);
    } catch (e) { onDone(`Import error: ${e.message}`); }
  };

  return (
    <div className="panel">
      <h2>Find businesses</h2>
      {status?.dataMode !== 'google_places' && (
        <p className="note">
          Running on <b>demo data</b>. Add a <code>GOOGLE_PLACES_API_KEY</code> in <code>server/.env</code>
          to search real businesses. (We use the official Places API — never Maps scraping.)
        </p>
      )}
      <div className="row">
        <label>Business type
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. restaurant, boutique, CA firm" />
        </label>
        <label>Area / region
          <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Mumbai, India" />
        </label>
        <button className="primary" disabled={busy} onClick={search}>{busy ? 'Searching…' : 'Search'}</button>
      </div>

      <div className="divider">or</div>

      <div className="row">
        <label className="filelabel">
          Import a CSV of leads (columns: name, email, phone, website, category, address)
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0])} />
        </label>
        <a className="button ghost" href="/api/export">Export all leads (CSV)</a>
      </div>
    </div>
  );
}

// ── Leads table ───────────────────────────────────────────────────────────────
function LeadsTab({ leads, selected, toggle, setSelected, refresh, flash }) {
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const shown = onlyNoWebsite ? leads.filter((l) => !l.hasWebsite) : leads;
  const allSelected = shown.length > 0 && shown.every((l) => selected.has(l.id));

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(shown.map((l) => l.id)));

  const unsub = async (id) => { await api.unsubscribe(id); await refresh(); flash('Marked unsubscribed.'); };
  const del = async (id) => { await api.deleteLead(id); await refresh(); };

  return (
    <div className="panel">
      <div className="toolbar">
        <label className="check"><input type="checkbox" checked={onlyNoWebsite} onChange={(e) => setOnlyNoWebsite(e.target.checked)} /> Only businesses with no website</label>
        <span className="muted">{shown.length} shown · {selected.size} selected</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th>Business</th><th>Category</th><th>Phone</th><th>Email</th><th>Website</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id} className={selected.has(l.id) ? 'sel' : ''}>
                <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                <td><b>{l.name}</b><div className="muted small">{l.address}</div></td>
                <td>{l.category}</td>
                <td>{l.phone || '—'}</td>
                <td>{l.email || '—'}</td>
                <td>{l.hasWebsite ? <a href={l.website} target="_blank" rel="noreferrer">yes</a> : <span className="tag">none</span>}</td>
                <td><span className={`status ${l.status}`}>{l.status}</span></td>
                <td className="actions">
                  <button className="link" onClick={() => unsub(l.id)}>unsub</button>
                  <button className="link danger" onClick={() => del(l.id)}>del</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan="8" className="empty">No leads yet — go to “Find leads”.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Outreach ──────────────────────────────────────────────────────────────────
function OutreachTab({ leads, selected, status, refresh, flash }) {
  const [tone, setTone] = useState('friendly');
  const [extra, setExtra] = useState('');
  const [preview, setPreview] = useState(null);
  const [sending, setSending] = useState(false);
  const selectedLeads = leads.filter((l) => selected.has(l.id));
  const withEmail = selectedLeads.filter((l) => l.email && l.status !== 'unsubscribed');

  const doPreview = async () => {
    const first = withEmail[0] || selectedLeads[0];
    if (!first) return flash('Select some leads in the Leads tab first.', 'warn');
    const { email } = await api.compose(first.id, tone, extra);
    setPreview({ ...email, lead: first });
  };

  const doSend = async () => {
    if (withEmail.length === 0) return flash('No selected leads have an email address.', 'warn');
    setSending(true);
    try {
      const r = await api.send(withEmail.map((l) => l.id), tone, extra);
      await refresh();
      flash(`${r.mode === 'dry-run' ? 'DRY-RUN' : 'Sent'}: ${r.sent} ok, ${r.failed} failed${r.capped ? ` (capped at ${r.cap})` : ''}.`);
    } catch (e) { flash(`Send error: ${e.message}`, 'warn'); }
    setSending(false);
  };

  return (
    <div className="panel">
      <h2>Outreach</h2>
      {status?.emailMode !== 'live' && (
        <p className="note">
          Email is in <b>DRY-RUN</b> mode — messages are written to <code>server/outbox/</code>, not actually sent.
          Configure <code>SMTP_*</code> in <code>server/.env</code> to send for real (only to recipients you may lawfully contact).
        </p>
      )}
      <div className="row">
        <label>Tone
          <select value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="concise">Concise</option>
          </select>
        </label>
        <label className="grow">Extra note for the AI (optional)
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. mention Diwali offer 20% off" />
        </label>
      </div>
      <p className="muted">{selectedLeads.length} selected · {withEmail.length} have an email &amp; are contactable.</p>
      <div className="btnrow">
        <button onClick={doPreview}>Preview email</button>
        <button className="primary" disabled={sending} onClick={doSend}>
          {sending ? 'Working…' : status?.emailMode === 'live' ? `Send to ${withEmail.length}` : `Dry-run ${withEmail.length}`}
        </button>
      </div>

      {preview && (
        <div className="preview">
          <div className="muted small">Preview for <b>{preview.lead.name}</b> · written by {preview.generatedBy}</div>
          <div className="subject"><b>Subject:</b> {preview.subject}</div>
          <pre>{preview.body}</pre>
        </div>
      )}
    </div>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────
function ServicesTab() {
  const [byCat, setByCat] = useState({});
  useEffect(() => { api.services().then((d) => setByCat(d.byCategory)); }, []);
  return (
    <div className="panel">
      <h2>Our services</h2>
      {Object.entries(byCat).map(([cat, items]) => (
        <div key={cat} className="svc-group">
          <h3>{cat}</h3>
          <div className="cards">
            {items.map((s) => (
              <div key={s.id} className="card"><b>{s.title}</b><p>{s.blurb}</p></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Activity log ──────────────────────────────────────────────────────────────
function ActivityTab() {
  const [events, setEvents] = useState([]);
  useEffect(() => { api.events().then((d) => setEvents(d.events)); }, []);
  return (
    <div className="panel">
      <h2>Activity</h2>
      {events.length === 0 && <p className="muted">No activity yet.</p>}
      <ul className="events">
        {events.map((e, i) => (
          <li key={i}><span className={`status ${e.type.includes('error') ? 'error' : 'ok'}`}>{e.type}</span> {e.to || ''} {e.subject ? `— ${e.subject}` : ''} <span className="muted small">{new Date(e.at).toLocaleString()}</span></li>
        ))}
      </ul>
    </div>
  );
}
