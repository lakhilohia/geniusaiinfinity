// Tiny JSON-file data store — no native dependencies, survives restarts.
// Good enough for v1; swap for SQLite/Postgres later without touching callers.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '../data');
const dbPath = path.join(dataDir, 'db.json');

fs.mkdirSync(dataDir, { recursive: true });

const DEFAULT = { leads: [], events: [] };

function read() {
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return structuredClone(DEFAULT);
  }
}

function write(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

let db = read();

export const store = {
  all() {
    return db.leads;
  },
  get(id) {
    return db.leads.find((l) => l.id === id);
  },
  // Upsert by (email || name+phone) so re-scanning an area doesn't duplicate.
  upsertMany(leads) {
    const added = [];
    for (const lead of leads) {
      const key = (lead.email || `${lead.name}|${lead.phone}`).toLowerCase();
      const existing = db.leads.find(
        (l) => (l.email || `${l.name}|${l.phone}`).toLowerCase() === key
      );
      if (existing) {
        Object.assign(existing, { ...lead, id: existing.id, status: existing.status });
      } else {
        db.leads.push(lead);
        added.push(lead);
      }
    }
    write(db);
    return added;
  },
  update(id, patch) {
    const lead = this.get(id);
    if (!lead) return null;
    Object.assign(lead, patch);
    write(db);
    return lead;
  },
  remove(id) {
    db.leads = db.leads.filter((l) => l.id !== id);
    write(db);
  },
  logEvent(evt) {
    db.events.push({ ...evt, at: new Date().toISOString() });
    write(db);
  },
  events() {
    return db.events;
  },
  reset() {
    db = structuredClone(DEFAULT);
    write(db);
  },
};
