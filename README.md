# GeniusAI Infinity — Offline Accounting for India

A fully **offline-first**, **Tally-compatible** double-entry accounting application
built for strict Indian statutory compliance — **Companies Act 2013 (Schedule III)**,
**Income-tax Act 1961 (TDS/TCS)**, **CGST/SGST/IGST Acts**, and **SEBI LODR**.

Stack: **Electron + React + TypeScript + SQLite (TypeORM)** with keyboard-first,
Tally-style data entry and PDF / Excel / Tally-XML export.

> All data lives in a **local SQLite file** (optionally AES-256 / SQLCipher
> encrypted). Nothing leaves the machine. No cloud, no account, no network.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Renderer (React, sandboxed)   src/renderer/                  │
│   • Schedule III Balance Sheet & P&L with 3-level drill-down  │
│   • Tally keyboard map (F1–F12, Alt+G, Ctrl+A, Esc …)         │
│   • window.api  ── typed IPC bridge, no Node access ──┐       │
└───────────────────────────────────────────────────────┼──────┘
                                                         │ contextBridge
┌────────────────────────────────────────────────────────▼─────┐
│  Electron main (Node)          electron/                      │
│   • ipc-handlers → engine + reports + tally + exporters       │
├───────────────────────────────────────────────────────────────┤
│  Domain core                   src/                           │
│   engine/    posting-engine · trial-balance · gst · tds       │
│              schedule3 (Companies Act mapping)                │
│   reports/   balance-sheet · profit-loss · ratios · exporters │
│   tally/     tally-xml import & export                        │
│   db/        TypeORM entities · SQLite · seeds · services     │
│   shared/    money (Decimal) · types · keybindings            │
└───────────────────────────────────────────────────────────────┘
```

### Design decisions
- **Money is never a `number`.** All monetary math uses `decimal.js`
  (`src/shared/money.ts`), stored as fixed-2dp strings — no IEEE-754 drift.
- **Reports assemble from group ancestry, not hard-coded lists.** Every
  `AccountGroup` carries (or inherits) a Schedule III `scheduleKey`; the
  Balance Sheet / P&L builders walk that tree, so a user re-grouping a ledger
  instantly re-classifies it in the statements.
- **The renderer is sandboxed.** It never imports TypeORM or touches the disk;
  every capability is a typed method on `window.api` (`electron/preload.ts`).

---

## Statutory compliance coverage

| Area | Where | Status |
|------|-------|--------|
| Schedule III sub-heads (Div I IGAAP + Div II Ind AS captions) | `engine/schedule3.ts` | ✅ full map |
| Balance Sheet (Equity & Liabilities / Assets) | `reports/balance-sheet.ts` | ✅ |
| Statement of P&L (Revenue → PBT → Tax → PAT → EPS) | `reports/profit-loss.ts` | ✅ |
| 11 mandatory Schedule III ratios | `reports/ratios.ts` | ✅ |
| GST engine — intra/inter split, HSN/SAC, cess, exports | `engine/gst-engine.ts` | ✅ |
| E-Invoice (IRP) & E-Way Bill JSON structures | `engine/gst-engine.ts` | ✅ scaffold |
| TDS/TCS — 194C/J/H/I/Q, 206C(1H), 206AA, thresholds | `engine/tds-engine.ts` | ✅ |
| MSME vs non-MSME trade-payables segregation | `db/entities/Ledger.ts` (`isMsme`) | ✅ tagging |
| SEBI LODR — Related Party tagging & RPT flag | `Ledger` / `Voucher` | ✅ tagging |
| Segment reporting (AS-17 / Ind AS 108) | `Ledger.segment` | ✅ tagging |
| Tally XML/JSON import & export | `tally/tally-xml.ts` | ✅ |

Items marked *scaffold/tagging* provide the data model and generators; the
filing-format report renderers (GSTR-1/3B, 3CD, RPT registers) build on top of
these primitives and are the next layer.

---

## The double-entry posting engine

`src/engine/posting-engine.ts` is the transactional heart:

1. **Σ(Dr) === Σ(Cr)** enforced before persistence (`assertBalanced`) — an
   unbalanced voucher throws `UnbalancedVoucherError` and nothing is written.
2. Every posting runs inside a single SQLite transaction with FK checks; a
   failure rolls back atomically.
3. Voucher numbers auto-increment per `(company, type)` with Tally-style
   prefixes (S0001, PY0001 …).
4. Amounts are always positive; direction lives in `drCr`. A ledger's signed
   balance is `Σ(+Dr −Cr)` (`engine/trial-balance.ts`).

---

## Drill-down

Balance Sheet / P&L lines drill **Report → sub-head → ledger → voucher**:
`components/ReportTree.tsx` expands group rows and, on a leaf ledger row, calls
`api.ledgerVouchers(ledgerId, toDate)` to inline every voucher that produced the
balance.

---

## Getting started

```bash
npm install
npm run dev        # Vite renderer + Electron shell (hot reload)
```

Production build & installer:

```bash
npm run build      # tsc (main) → vite build (renderer) → electron-builder
```

Quality gates:

```bash
npm run typecheck  # both tsconfigs, strict
npm test           # engine unit tests (posting / GST / TDS)
```

> **Native modules:** `better-sqlite3` builds against your Electron ABI on
> `npm install`. For the encrypted variant, swap in
> `better-sqlite3-multiple-ciphers` (the `prepareDatabase` hook in
> `db/data-source.ts` already issues the SQLCipher `PRAGMA key`).

---

## Keyboard (Tally parity)

`src/shared/keybindings.ts` — F4 Contra · F5 Payment · F6 Receipt · F7 Journal ·
F8 Sales · F9 Purchase · Ctrl+F8/F9 Credit/Debit Note · Alt+G Go To ·
Alt+C Create master · Ctrl+A Accept · Alt+E Export · Esc Back · Enter Drill.

---

## Repository layout

```
electron/            Electron main, preload bridge, IPC handlers & channels
src/shared/          money.ts · types.ts · keybindings.ts
src/db/              entities/ · data-source.ts · seed/ · services/
src/engine/          posting-engine · trial-balance · schedule3 · gst · tds
src/reports/         balance-sheet · profit-loss · ratios · schedule3-builder
src/reports/exporters/  pdf.ts (pdfmake) · excel.ts (exceljs)
src/tally/           tally-xml.ts (ENVELOPE import/export)
src/renderer/        React app, components/, hooks/, styles.css
legacy/              prior "Genius Infinity v3" build artifacts (archived)
```

---

## Tests

`src/engine/__tests__/engines.test.ts` — 11 passing tests covering balanced /
unbalanced / split vouchers, intra vs inter-state GST, exports, and TDS
thresholds incl. 194Q above-threshold-only and 206AA no-PAN rate.
