# GeniusAI Infinity

An **umbrella platform** to (1) find local business leads, (2) spot which of them
have **no website**, and (3) send them a professional email offering your services —
website & app development, VR/360° views, graphic & poster design, accounting,
income-tax & GST filing, company compliance, legal, and government applications.

This is **v1: Lead-gen + Email outreach**. It runs today on demo data and grows
into real data and real sending as you add keys.

---

## What it does

| Step | How |
|------|-----|
| **Find businesses** | Google **Places API** (legal & supported) when you add a key, otherwise realistic **demo data**. You can also **import a CSV**. |
| **Detect "no website"** | Each lead is flagged `hasWebsite: true/false`; filter to just the ones who need one. |
| **Store leads** | Saved to `server/data/db.json` (name, phone, email, website, status). |
| **Write the email** | A free/optional **LLM** personalises it; a built-in **template** is the reliable fallback. |
| **Send** | **DRY-RUN by default** (writes `.eml` files to `server/outbox/`). Real sending only when you configure SMTP. Unsubscribe + per-batch safety cap built in. |

## Run it

```bash
npm run install:all      # installs server + web deps
cp server/.env.example server/.env   # optional: add your keys

# Development (two terminals):
npm run dev:server       # backend on :4000
npm run dev:web          # frontend on :5173  (open this)

# OR production-style (one server serves the built UI):
npm run build            # builds web/dist
npm start                # http://localhost:4000
```

With **no `.env`**, everything still works: demo leads, template emails, dry-run sending.

## Adding real capabilities (all optional)

Edit `server/.env`:

- `GOOGLE_PLACES_API_KEY` → real businesses from Google Places (Text Search + Details).
- `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY` → any OpenAI-compatible endpoint
  (including a free relay) writes the emails. Falls back to template if it fails.
- `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` → **turns on real email sending.**

## ⚠️ Use responsibly — please read

- **Never scrape Google Maps.** It breaks Google's Terms and gets you blocked.
  This app uses the official **Places API** only.
- **Cold email is regulated** (India DPDP Act, GDPR, CAN-SPAM). Sending unsolicited
  bulk mail to scraped addresses can get your domain blacklisted and carry fines.
  Prefer **consent-based** outreach, keep volumes low, send from a verified domain,
  and **always honour unsubscribe** (built in here).
- The **safety cap** (`MAX_EMAILS_PER_BATCH`, default 25) limits how many go out per request.

## Project layout

```
server/            Node + Express backend (no native deps)
  src/config.js      .env loader + capability flags
  src/places.js      Places API + demo generator + website detection
  src/leads.js       CSV import/export
  src/llm.js         AI email writer (+ template fallback)
  src/email.js       dry-run / SMTP sender, unsubscribe, safety cap
  src/store.js       JSON-file data store
  src/index.js       REST API + serves the built UI
web/               React (Vite) frontend — Find / Leads / Outreach / Services / Activity
legacy/            your earlier compiled "Google AI Studio" upload, preserved
```

## Roadmap (next modules under the umbrella)

- Services landing site with an inbound enquiry form (legal lead capture).
- Accounting app (invoices, GST, ledgers).
- WhatsApp / call outreach with consent tracking.
- Scheduler for reminder emails.
