// CSV import/export helpers for leads (no external CSV library needed).
import crypto from 'node:crypto';

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields and commas/newlines).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

export function leadsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names) => header.findIndex((h) => names.includes(h));
  const iName = idx(['name', 'business', 'business name', 'company']);
  const iEmail = idx(['email', 'e-mail', 'mail']);
  const iPhone = idx(['phone', 'contact', 'mobile', 'number']);
  const iWebsite = idx(['website', 'url', 'site']);
  const iCategory = idx(['category', 'type', 'industry']);
  const iAddress = idx(['address', 'location', 'city']);

  return rows.slice(1).map((r) => {
    const website = iWebsite >= 0 ? (r[iWebsite] || '').trim() : '';
    return {
      id: newId(),
      name: iName >= 0 ? (r[iName] || '').trim() : '',
      email: iEmail >= 0 ? (r[iEmail] || '').trim() : '',
      phone: iPhone >= 0 ? (r[iPhone] || '').trim() : '',
      website,
      hasWebsite: Boolean(website),
      category: iCategory >= 0 ? (r[iCategory] || '').trim() : '',
      address: iAddress >= 0 ? (r[iAddress] || '').trim() : '',
      rating: null,
      source: 'csv',
      status: 'new',
      foundAt: new Date().toISOString(),
    };
  }).filter((l) => l.name || l.email || l.phone);
}

export function leadsToCsv(leads) {
  const cols = ['name', 'category', 'address', 'phone', 'email', 'website', 'hasWebsite', 'rating', 'source', 'status'];
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const l of leads) lines.push(cols.map((c) => esc(l[c])).join(','));
  return lines.join('\n');
}
