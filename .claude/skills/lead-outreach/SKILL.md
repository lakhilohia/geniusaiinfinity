---
name: lead-outreach
description: >
  Find business leads for GeniusAI Infinity, detect which have no website, and
  draft/send compliant service-offer emails. Use when the user wants to search
  businesses by area/category, import or export leads, filter to businesses with
  no website, or compose and send (dry-run or live) outreach emails offering the
  company's services (web/app dev, VR, design, accounting, ITR/GST filing,
  company compliance, legal, government applications).
---

# Lead Outreach (GeniusAI Infinity)

A repeatable workflow for finding leads and sending service-offer emails **the
legitimate way**. Read `CLAUDE.md` first for the business context and the hard rules.

## Golden rules (never break)

1. **No Google Maps scraping** — use the Google Places API only.
2. **Respect email law** (India DPDP Act / GDPR / CAN-SPAM): keep unsubscribe,
   keep the per-batch cap, default to DRY-RUN, prefer consent-based sending.
3. **Always keep the template fallback** for the AI email writer.

## Prerequisites

```bash
npm run install:all           # once
cp server/.env.example server/.env   # optional keys
npm start                     # serves API + UI on http://localhost:4000
```

The app works with **no keys** (demo data + template email + dry-run send).

## Workflow

### 1. Find leads
- UI: **Find leads** tab → enter business type + area → Search.
- API: `POST /api/search { "query": "bakery", "region": "Pune, India" }`
- Or import: `POST /api/import` with a CSV body (`Content-Type: text/csv`).
  Columns understood: name, email, phone, website, category, address.

### 2. Focus on businesses with no website
- UI: **Leads** tab → tick "Only businesses with no website".
- API: `GET /api/leads?noWebsite=true`

### 3. Preview the email
- `POST /api/compose { "leadId": "...", "tone": "friendly", "extra": "optional note" }`
- Uses the LLM if `LLM_BASE_URL` is set, else the built-in template.

### 4. Send (dry-run by default)
- Select leads in the UI → **Outreach** tab → Send.
- API: `POST /api/send { "leadIds": ["..."], "tone": "friendly" }`
- With no SMTP configured, messages are written to `server/outbox/*.eml` (nothing sent).
- The batch is capped at `MAX_EMAILS_PER_BATCH` (default 25). Unsubscribed leads are skipped.

### 5. Honour opt-outs
- `POST /api/leads/:id/unsubscribe` sets status `unsubscribed`; those leads are never emailed.

## Going live (only with consent + verified domain)
Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `server/.env` to switch from dry-run to
real sending. Start with tiny batches, monitor bounces, keep the unsubscribe line.

## Extending the service catalogue
Edit `server/src/services.js` — it's the single source used by both the emails and the
Services tab.
