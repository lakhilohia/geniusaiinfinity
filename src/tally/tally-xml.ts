import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { DrCr, VoucherType } from '../shared/types';

// ─────────────────────────────────────────────────────────────────────────
// Tally ERP 9 / TallyPrime XML interchange. Tally uses the <ENVELOPE> format
// where negative AMOUNT denotes a debit (ISDEEMEDPOSITIVE = "Yes"), positive a
// credit. Dates are YYYYMMDD. This module converts to/from our neutral DTOs.
// ─────────────────────────────────────────────────────────────────────────

export interface ParsedGroup { name: string; parent?: string; nature?: string; }
export interface ParsedLedger { name: string; parent: string; openingBalance: string; gstin?: string; }
export interface ParsedStockItem { name: string; unit?: string; openingQty?: string; openingValue?: string; }
export interface ParsedVoucherLine { ledgerName: string; drCr: DrCr; amount: string; }
export interface ParsedVoucher {
  type: VoucherType;
  voucherTypeName: string;
  voucherNumber?: string;
  date: string; // ISO
  narration?: string;
  reference?: string;
  partyName?: string;
  lines: ParsedVoucherLine[];
}
export interface TallyImport {
  groups: ParsedGroup[];
  ledgers: ParsedLedger[];
  stockItems: ParsedStockItem[];
  vouchers: ParsedVoucher[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
});

const asArray = <T>(v: T | T[] | undefined): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const tallyDateToIso = (d: string): string =>
  /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

const VCH_TYPE_MAP: Record<string, VoucherType> = {
  sales: VoucherType.Sales,
  purchase: VoucherType.Purchase,
  payment: VoucherType.Payment,
  receipt: VoucherType.Receipt,
  contra: VoucherType.Contra,
  journal: VoucherType.Journal,
  'debit note': VoucherType.DebitNote,
  'credit note': VoucherType.CreditNote,
  'stock journal': VoucherType.StockJournal,
};

/** Parse a Tally export XML string into neutral DTOs for persistence. */
export function parseTallyXml(xml: string): TallyImport {
  const doc = parser.parse(xml);
  const messages = asArray(
    doc?.ENVELOPE?.BODY?.IMPORTDATA?.REQUESTDATA?.TALLYMESSAGE
    ?? doc?.ENVELOPE?.BODY?.DATA?.TALLYMESSAGE,
  );

  const out: TallyImport = { groups: [], ledgers: [], stockItems: [], vouchers: [] };

  for (const msg of messages) {
    for (const g of asArray(msg.GROUP)) {
      out.groups.push({
        name: g['@_NAME'] ?? g.NAME,
        parent: g.PARENT || undefined,
        nature: g._PRIMARYGROUP || undefined,
      });
    }
    for (const l of asArray(msg.LEDGER)) {
      out.ledgers.push({
        name: l['@_NAME'] ?? l.NAME,
        parent: l.PARENT,
        openingBalance: normaliseAmount(l.OPENINGBALANCE ?? '0'),
        gstin: l.PARTYGSTIN || undefined,
      });
    }
    for (const s of asArray(msg.STOCKITEM)) {
      out.stockItems.push({
        name: s['@_NAME'] ?? s.NAME,
        unit: s.BASEUNITS || undefined,
        openingQty: s.OPENINGBALANCE || undefined,
        openingValue: s.OPENINGVALUE ? normaliseAmount(s.OPENINGVALUE) : undefined,
      });
    }
    for (const v of asArray(msg.VOUCHER)) {
      const typeName: string = v.VOUCHERTYPENAME ?? v['@_VCHTYPE'] ?? 'Journal';
      const lines: ParsedVoucherLine[] = asArray(v['ALLLEDGERENTRIES.LIST'] ?? v['LEDGERENTRIES.LIST'])
        .map((e: any) => {
          const amt = String(e.AMOUNT ?? '0');
          const deemedPositive = String(e.ISDEEMEDPOSITIVE ?? '').toLowerCase() === 'yes';
          // In Tally, ISDEEMEDPOSITIVE=Yes ⇒ debit; negative amount ⇒ debit too.
          const isDebit = deemedPositive || amt.trim().startsWith('-');
          return {
            ledgerName: e.LEDGERNAME,
            drCr: (isDebit ? 'DR' : 'CR') as DrCr,
            amount: normaliseAmount(amt),
          };
        });

      out.vouchers.push({
        type: VCH_TYPE_MAP[typeName.toLowerCase()] ?? VoucherType.Journal,
        voucherTypeName: typeName,
        voucherNumber: v.VOUCHERNUMBER ? String(v.VOUCHERNUMBER) : undefined,
        date: tallyDateToIso(String(v.DATE ?? '')),
        narration: v.NARRATION || undefined,
        reference: v.REFERENCE || undefined,
        partyName: v.PARTYLEDGERNAME || undefined,
        lines,
      });
    }
  }
  return out;
}

function normaliseAmount(raw: string): string {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.abs(n).toFixed(2) : '0.00';
}

// ── Export ────────────────────────────────────────────────────────────────
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
});

export interface ExportVoucher {
  type: string;
  date: string; // ISO
  voucherNumber: string;
  narration?: string;
  lines: { ledgerName: string; drCr: DrCr; amount: string }[];
}

/** Build a Tally-importable XML envelope from our vouchers. */
export function buildTallyVoucherXml(companyName: string, vouchers: ExportVoucher[]): string {
  const isoToTally = (d: string) => d.replace(/-/g, '');
  const messages = vouchers.map((v) => ({
    VOUCHER: {
      '@_VCHTYPE': v.type,
      '@_ACTION': 'Create',
      DATE: isoToTally(v.date),
      VOUCHERTYPENAME: v.type,
      VOUCHERNUMBER: v.voucherNumber,
      NARRATION: v.narration ?? '',
      'ALLLEDGERENTRIES.LIST': v.lines.map((l) => ({
        LEDGERNAME: l.ledgerName,
        ISDEEMEDPOSITIVE: l.drCr === 'DR' ? 'Yes' : 'No',
        // Tally convention: debit negative, credit positive.
        AMOUNT: (l.drCr === 'DR' ? '-' : '') + Number(l.amount).toFixed(2),
      })),
    },
  }));

  const envelope = {
    ENVELOPE: {
      HEADER: { TALLYREQUEST: 'Import Data' },
      BODY: {
        IMPORTDATA: {
          REQUESTDESC: {
            REPORTNAME: 'Vouchers',
            STATICVARIABLES: { SVCURRENTCOMPANY: companyName },
          },
          REQUESTDATA: { TALLYMESSAGE: messages },
        },
      },
    },
  };
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(envelope);
}
