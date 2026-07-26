# CoserveU — powered by studymadease

An **offline-first holistic health web app** combining classical Ayurvedic
guidance (*Charaka Samhita*, *Ashtanga Hridaya*) with modern nutrition, covering
**lung (ILD), eye (cataract/conjunctivitis), ear, gallbladder-stone, skin
(Kushtha), digestive and sleep (insomnia)** concerns — where one diet plan
complements another.

Founder: **Adv. Lakhi Lohia** (non-executive advisory role). Branded *"CoserveU
powered by studymadease"* so it is not run as an advocate's personal commercial
trade.

> ⚠️ **Educational use only — not medical advice.** This app does not diagnose,
> treat or cure disease. Herbs can interact with medicines and conditions.
> Always consult a qualified physician / registered Ayurvedic practitioner.

## Features

- **Interactive symptom checker** across lung, eye, ear, gallbladder, skin,
  digestive and sleep symptoms → builds one combined protocol.
- **Holistic diet plan builder** with a **conflict engine** that resolves
  overlaps (e.g. gallbladder low-fat priority vs. heavy oily lung foods; warm
  lungs vs. cooling eyes) and a suggested unified daily menu.
- **What to have / what to avoid** for every condition, each with a **classical
  citation** and an **indicative modern reference**.
- **Ayurvedic herbal formulations directory** (Triphala, Mulethi, Ashwagandha,
  Vasaka, Guggulu, Neem, Turmeric) with traditional uses, modern direction,
  dosage and **contraindications**.
- **Sujok & homeopathy** complementary guidance (symptomatic, clearly labelled).
- **Offline meal & remedy logger** (stored locally on the device).
- **Role-based access:** Admin (the two admin emails) · Subscribed (₹100/week) ·
  Free tier.
- **Offline-first PWA:** a service worker caches the whole app so it opens and
  runs with **no internet**. Login-audit records queue offline and sync to the
  admin Google Sheet when back online.

## Works fully offline

Unlike the earlier drafts (which loaded Tailwind from a CDN and therefore broke
offline), **all CSS and JS are inlined** and a **service worker** (`sw.js`)
caches the app shell. After the first visit it works with the network off.

## Deploy on Netlify (drag & drop)

1. Download this folder (or the repo) so you have `index.html`, `sw.js`,
   `manifest.webmanifest`, `icon.svg`, `netlify.toml`.
2. Zip the folder.
3. Go to **app.netlify.com/drop** and drag the zip in. You get a live HTTPS URL.

> A service worker needs HTTPS (Netlify provides it) or `localhost`. Opening
> `index.html` directly via `file://` runs the app but the offline service
> worker won't register — that's a browser rule, not an app bug.

Test locally with any static server, e.g. `python3 -m http.server 8080` then open
`http://localhost:8080`.

## Admin: Google Sheet login sync

See **`google-apps-script.gs`** for the receiver script and step-by-step setup.
Paste the deployed `/exec` URL into the app under **About & Safety**.

Personal data (name, email, address, time) is only collected **with the user's
consent** shown on the form. Keep the sheet private and comply with applicable
privacy law (e.g. India's DPDP Act, 2023).

## Notes / honest limitations

- **Payments:** the ₹100/week unlock is a **client-side demo flag**. A static
  offline site cannot securely take payments or truly enforce a paywall —
  integrate a real payment gateway + backend before charging.
- **Citations** are indicative pointers to classical chapters and modern
  research areas for further reading, not verified clinical endorsements.

## Files

| File | Purpose |
|---|---|
| `index.html` | The entire app (inline CSS + JS). |
| `sw.js` | Service worker for offline caching. |
| `manifest.webmanifest` | PWA manifest (installable). |
| `icon.svg` | App icon. |
| `netlify.toml` | Netlify headers/config. |
| `google-apps-script.gs` | Admin Google Sheet receiver. |
| `archive/` | Previous unrelated build, kept for reference. |
