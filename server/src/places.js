// Business discovery.
//   • With a Google Places API key  -> real businesses (legitimate, ToS-compliant).
//   • Without one                    -> realistic demo leads, so the whole pipeline
//                                       works end-to-end before you buy a key.
//
// We deliberately do NOT scrape Google Maps HTML — that violates Google's Terms
// and gets you blocked. The Places API is the supported, legal path.
import crypto from 'node:crypto';
import { config } from './config.js';

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function makeLead(partial) {
  return {
    id: newId(),
    name: '',
    category: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    hasWebsite: false,
    rating: null,
    source: 'demo',
    status: 'new', // new | queued | contacted | replied | unsubscribed
    foundAt: new Date().toISOString(),
    ...partial,
  };
}

// ── Real data via Google Places API (Text Search) ────────────────────────────
async function searchPlaces(query, region) {
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  const params = new URLSearchParams({
    query: `${query} in ${region}`,
    key: config.googlePlacesApiKey,
  });
  const res = await fetch(`${url}?${params}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API: ${data.status} ${data.error_message || ''}`);
  }
  const results = data.results || [];

  // Fetch phone + website via Place Details (one call each).
  const leads = [];
  for (const r of results.slice(0, 20)) {
    let phone = '';
    let website = '';
    try {
      const dParams = new URLSearchParams({
        place_id: r.place_id,
        fields: 'formatted_phone_number,website',
        key: config.googlePlacesApiKey,
      });
      const dRes = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${dParams}`);
      const dData = await dRes.json();
      phone = dData.result?.formatted_phone_number || '';
      website = dData.result?.website || '';
    } catch {
      /* ignore per-place detail failures */
    }
    leads.push(
      makeLead({
        name: r.name,
        category: query,
        address: r.formatted_address || '',
        phone,
        website,
        hasWebsite: Boolean(website),
        rating: r.rating ?? null,
        source: 'google_places',
      })
    );
  }
  return leads;
}

// ── Demo data generator ──────────────────────────────────────────────────────
const DEMO_SUFFIXES = ['Traders', 'Store', 'Enterprises', 'Services', 'Hub', 'Centre', 'Mart', 'Works', '& Co', 'Point'];
const DEMO_STREETS = ['MG Road', 'Station Road', 'Main Bazaar', 'Gandhi Chowk', 'Ring Road', 'Market Lane'];

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function generateDemo(query, region, count = 12) {
  const leads = [];
  for (let i = 0; i < count; i++) {
    const suffix = DEMO_SUFFIXES[i % DEMO_SUFFIXES.length];
    const name = `${region.split(',')[0]} ${query} ${suffix}`.replace(/\b\w/g, (c) => c.toUpperCase());
    // ~65% of small local businesses have no website — that's the opportunity.
    const hasWebsite = Math.random() < 0.35;
    const website = hasWebsite ? `https://${slug(query)}${i}.example.com` : '';
    leads.push(
      makeLead({
        name,
        category: query,
        address: `${10 + i} ${DEMO_STREETS[i % DEMO_STREETS.length]}, ${region}`,
        phone: `+91-9${String(800000000 + Math.floor(Math.random() * 99999999)).slice(0, 9)}`,
        // Demo contacts use example.com (a reserved, non-deliverable domain) on purpose.
        email: hasWebsite ? '' : `owner@${slug(name)}.example.com`,
        website,
        hasWebsite,
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        source: 'demo',
      })
    );
  }
  return leads;
}

export async function findBusinesses({ query, region }) {
  if (!query || !region) throw new Error('query and region are required');
  if (config.googlePlacesApiKey) {
    return { mode: 'google_places', leads: await searchPlaces(query, region) };
  }
  return { mode: 'demo', leads: generateDemo(query, region) };
}
