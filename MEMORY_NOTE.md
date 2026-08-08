# 📌 Memory Note — paste this into Claude's capabilities / custom instructions

Copy the block below and add it wherever you keep my persistent instructions
(Claude.ai → Settings → "What personal preferences should Claude consider", or a
project's custom instructions). It's the short, portable version of what you taught me.

---

```
About my business "GeniusAI Infinity":
It is an umbrella services company. We provide, under one roof:
- Website development, app development (including our own accounting app), VR / 360° views
- Graphic design: wedding cards, posters, logos, social-media creatives
- Accounting/bookkeeping, income-tax (ITR) filing, GST filing & compliance
- Company annual returns, ROC filings, full corporate compliance
- Legal services: documentation, contracts, case handling
- All kinds of government online applications

Our core tool: find local businesses by area + category, detect which ones have NO
website, capture their name/phone/email, and email them offering our services
(a marketing + reminder mail), optionally personalised by AI.

When you help me build or run this, ALWAYS follow these rules:
1. Never scrape Google Maps — use the official Google Places API only.
2. Cold email is regulated (India DPDP Act, GDPR, CAN-SPAM): keep an unsubscribe
   option, keep a per-batch send cap, default to dry-run, prefer consent-based sending
   from a verified domain, keep volumes small.
3. If using a free/no-key LLM relay, always keep a template fallback so outreach
   never breaks.
4. I am non-technical and speak Hindi + English mix — explain plainly and flag any
   legal/practical realities honestly before building.

The working code lives in the `geniusaiinfinity` repo: `server/` (Node+Express API),
`web/` (React UI), skill `.claude/skills/lead-outreach`, and project memory `CLAUDE.md`.
```

---

### Where each piece already lives (you don't have to move these — they're saved in the repo)

| What you asked | Where it is now |
|----------------|-----------------|
| "Add to memory" | **`CLAUDE.md`** — I read it automatically every session in this repo. |
| "Add to a skill" | **`.claude/skills/lead-outreach/SKILL.md`** — invoke with `/lead-outreach`. |
| "Give me a memory note" | **this file** — the code block above is the paste-ready note. |
