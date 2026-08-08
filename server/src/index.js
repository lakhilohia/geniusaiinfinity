import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, flags } from './config.js';
import { store } from './store.js';
import { findBusinesses } from './places.js';
import { leadsFromCsv, leadsToCsv } from './leads.js';
import { composeEmail } from './llm.js';
import { sendBatch, emailMode } from './email.js';
import { SERVICES, servicesByCategory } from './services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.text({ type: 'text/csv', limit: '5mb' }));

// ── Status / capability flags (drives the UI banners) ────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    business: config.business,
    dataMode: flags.hasPlaces ? 'google_places' : 'demo',
    llmMode: flags.hasLlm ? 'llm' : 'template',
    emailMode: emailMode(),
    maxEmailsPerBatch: config.maxEmailsPerBatch,
  });
});

app.get('/api/services', (req, res) => {
  res.json({ services: SERVICES, byCategory: servicesByCategory() });
});

// ── Find businesses (Places API or demo) and save them as leads ──────────────
app.post('/api/search', async (req, res) => {
  try {
    const { query, region } = req.body || {};
    const { mode, leads } = await findBusinesses({ query, region });
    const added = store.upsertMany(leads);
    res.json({ mode, found: leads.length, added: added.length, leads });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

// ── Leads CRUD ───────────────────────────────────────────────────────────────
app.get('/api/leads', (req, res) => {
  const { noWebsite, status } = req.query;
  let leads = store.all();
  if (noWebsite === 'true') leads = leads.filter((l) => !l.hasWebsite);
  if (status) leads = leads.filter((l) => l.status === status);
  res.json({ leads, total: leads.length });
});

app.patch('/api/leads/:id', (req, res) => {
  const lead = store.update(req.params.id, req.body || {});
  if (!lead) return res.status(404).json({ error: 'not found' });
  res.json({ lead });
});

app.delete('/api/leads/:id', (req, res) => {
  store.remove(req.params.id);
  res.json({ ok: true });
});

app.post('/api/leads/:id/unsubscribe', (req, res) => {
  const lead = store.update(req.params.id, { status: 'unsubscribed' });
  if (!lead) return res.status(404).json({ error: 'not found' });
  store.logEvent({ type: 'unsubscribe', leadId: lead.id });
  res.json({ lead });
});

// ── CSV import / export ──────────────────────────────────────────────────────
app.post('/api/import', (req, res) => {
  try {
    const text = typeof req.body === 'string' ? req.body : req.body?.csv || '';
    const leads = leadsFromCsv(text);
    const added = store.upsertMany(leads);
    res.json({ parsed: leads.length, added: added.length });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.get('/api/export', (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(leadsToCsv(store.all()));
});

// ── Compose a preview email for one lead ─────────────────────────────────────
app.post('/api/compose', async (req, res) => {
  const { leadId, tone, extra } = req.body || {};
  const lead = store.get(leadId);
  if (!lead) return res.status(404).json({ error: 'lead not found' });
  const email = await composeEmail(lead, { tone, extra });
  res.json({ email });
});

// ── Send outreach to selected leads (dry-run unless SMTP configured) ─────────
app.post('/api/send', async (req, res) => {
  try {
    const { leadIds, tone, extra } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds[] required' });
    }
    const items = [];
    for (const id of leadIds) {
      const lead = store.get(id);
      if (!lead) continue;
      const email = await composeEmail(lead, { tone, extra });
      items.push({ lead, subject: email.subject, body: email.body });
    }
    const result = await sendBatch(items);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
});

app.get('/api/events', (req, res) => res.json({ events: store.events().slice(-200).reverse() }));

// ── Serve the built frontend (web/dist) if present ───────────────────────────
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(config.port, () => {
  console.log(`\n  GeniusAI Infinity server → http://localhost:${config.port}`);
  console.log(`  data: ${flags.hasPlaces ? 'Google Places' : 'DEMO'} | ai: ${flags.hasLlm ? 'LLM' : 'template'} | email: ${emailMode().toUpperCase()}\n`);
});
