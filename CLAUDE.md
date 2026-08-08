# GeniusAI Infinity — Project Memory

> This file is read automatically at the start of every session. It captures the
> product vision, the owner's instructions, and the rules to work by.

## What this business is

**GeniusAI Infinity** is an *umbrella* services company. Under one roof it offers:

- **Digital:** website development, app development (incl. our own accounting app), VR / 360° views.
- **Design:** wedding cards, posters, logos, social-media creatives.
- **Finance:** accounting/bookkeeping, income-tax (ITR) filing, GST filing & compliance.
- **Compliance:** company annual returns, ROC filings, full corporate compliance.
- **Legal:** documentation, contracts, case handling.
- **Government:** all kinds of government online applications & scheme filings.

## The core product idea (owner's vision)

A platform that:
1. **Finds businesses/leads** across India and worldwide (by area + category).
2. **Detects which of them have no website**, and captures their **name, phone, email, address**.
3. **Sends them an email** offering the services above (a marketing + reminder mail).
4. Optionally uses a **free/low-cost LLM** to personalise those emails.

This is built as **v1: Lead-gen + Email outreach** (see `README.md`). Future modules
under the umbrella: services landing site with enquiry form, the accounting app,
WhatsApp/call outreach, and a reminder scheduler.

## Hard rules (do not violate — these protect the business)

1. **Never scrape Google Maps / Google HTML.** It breaks Google's ToS and gets the
   account blocked. Use the official **Google Places API** only. The code already
   does this; keep it that way.
2. **Cold email is regulated** (India **DPDP Act**, **GDPR**, **CAN-SPAM**). Do not
   design anything that blasts unsolicited mail to scraped addresses. Always:
   - keep an **unsubscribe** path (built in — status `unsubscribed` is skipped),
   - keep the **per-batch safety cap** (`MAX_EMAILS_PER_BATCH`, default 25),
   - default to **DRY-RUN** (write `.eml` to `server/outbox/`, don't send) until SMTP is set,
   - prefer **consent-based** outreach and a **verified sending domain**.
3. **Free "no-key" LLM relays are unreliable.** Always keep the **template fallback**
   so outreach never breaks when a relay disappears.
4. The owner communicates in **Hindi + English mix** and is **non-technical** — explain
   plainly, flag legal/practical realities honestly, and don't assume coding knowledge.

## How the code is organised

- `server/` — Node + Express, **no native deps**. JSON-file store (`server/data/`).
  Key files: `config.js` (env + capability flags), `places.js` (Places API + demo +
  website detection), `leads.js` (CSV), `llm.js` (AI writer + template fallback),
  `email.js` (dry-run/SMTP sender), `index.js` (REST API + serves the built UI).
- `web/` — React (Vite) UI: tabs **Find leads / Leads / Outreach / Services / Activity**.
- `legacy/` — the owner's earlier compiled "Google AI Studio" upload, preserved.

## Everything is optional-key driven

With **no `.env`** the app fully works: **demo data**, **template** emails, **dry-run** send.
Add keys in `server/.env` to unlock real data (`GOOGLE_PLACES_API_KEY`), AI emails
(`LLM_BASE_URL`), and real sending (`SMTP_*`).

## Working conventions

- Develop on branch `claude/service-platform-app-dev-hc6717`; commit + push there.
- Keep dependencies minimal. Prefer standard library over new packages.
- When adding a new service to the offering, edit `server/src/services.js` (single source).
