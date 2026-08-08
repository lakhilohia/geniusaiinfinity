// Thin fetch wrapper around the backend API.
async function j(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export const api = {
  status: () => j('GET', '/api/status'),
  services: () => j('GET', '/api/services'),
  search: (query, region) => j('POST', '/api/search', { query, region }),
  leads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return j('GET', `/api/leads${qs ? `?${qs}` : ''}`);
  },
  updateLead: (id, patch) => j('PATCH', `/api/leads/${id}`, patch),
  deleteLead: (id) => j('DELETE', `/api/leads/${id}`),
  unsubscribe: (id) => j('POST', `/api/leads/${id}/unsubscribe`),
  compose: (leadId, tone, extra) => j('POST', '/api/compose', { leadId, tone, extra }),
  send: (leadIds, tone, extra) => j('POST', '/api/send', { leadIds, tone, extra }),
  events: () => j('GET', '/api/events'),
  importCsv: async (text) => {
    const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text });
    if (!res.ok) throw new Error('import failed');
    return res.json();
  },
};
