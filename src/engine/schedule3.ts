import { AccountNature, ScheduleIIIDivision } from '../shared/types';

/**
 * Schedule III to the Companies Act, 2013 — machine-readable sub-head map.
 *
 * `Division I` (IGAAP) is modelled in full below. Division II (Ind AS) shares
 * the same keys for the line items common to both; the `divIILabel` overrides
 * the caption where Ind AS terminology differs (e.g. "Property, Plant and
 * Equipment" and "Other Equity"). Reports pick the caption by division.
 *
 * Assembly rule: every AccountGroup carries (or inherits) a `scheduleKey`.
 * The Balance Sheet / P&L builders sum ledger closing balances by scheduleKey,
 * then nest by `parent`, giving a fully drill-downable statement tree.
 */

export type Statement = 'BS' | 'PL';
export type Section = 'EQ_LIAB' | 'ASSET' | 'INCOME' | 'EXPENSE' | 'TAX' | 'EXCEPTIONAL';

export interface ScheduleHead {
  key: string;
  label: string; // Division I caption
  divIILabel?: string; // Division II (Ind AS) caption override
  statement: Statement;
  section: Section;
  parent: string | null;
  nature: AccountNature; // expected normal nature of member ledgers
  sortOrder: number;
  noteRef?: number; // note-to-accounts reference
}

const H = (h: ScheduleHead): [string, ScheduleHead] => [h.key, h];

export const SCHEDULE_III_MAP: Record<string, ScheduleHead> = Object.fromEntries([
  // ══════════════ BALANCE SHEET — EQUITY & LIABILITIES ══════════════════
  H({ key: 'BS.EL.SHF', label: "Shareholders' Funds", divIILabel: 'Equity', statement: 'BS', section: 'EQ_LIAB', parent: null, nature: AccountNature.Equity, sortOrder: 100 }),
  H({ key: 'BS.EL.SHF.CAP', label: 'Share Capital', divIILabel: 'Equity Share Capital', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.SHF', nature: AccountNature.Equity, sortOrder: 101, noteRef: 1 }),
  H({ key: 'BS.EL.SHF.RES', label: 'Reserves & Surplus', divIILabel: 'Other Equity', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.SHF', nature: AccountNature.Equity, sortOrder: 102, noteRef: 2 }),
  H({ key: 'BS.EL.SHF.WAR', label: 'Money received against share warrants', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.SHF', nature: AccountNature.Equity, sortOrder: 103 }),

  H({ key: 'BS.EL.SAM', label: 'Share Application Money Pending Allotment', statement: 'BS', section: 'EQ_LIAB', parent: null, nature: AccountNature.Equity, sortOrder: 110 }),

  H({ key: 'BS.EL.NCL', label: 'Non-Current Liabilities', statement: 'BS', section: 'EQ_LIAB', parent: null, nature: AccountNature.Liability, sortOrder: 120 }),
  H({ key: 'BS.EL.NCL.LTB', label: 'Long-term borrowings', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.NCL', nature: AccountNature.Liability, sortOrder: 121, noteRef: 3 }),
  H({ key: 'BS.EL.NCL.DTL', label: 'Deferred tax liabilities (net)', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.NCL', nature: AccountNature.Liability, sortOrder: 122 }),
  H({ key: 'BS.EL.NCL.OTH', label: 'Other long-term liabilities', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.NCL', nature: AccountNature.Liability, sortOrder: 123 }),
  H({ key: 'BS.EL.NCL.PROV', label: 'Long-term provisions', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.NCL', nature: AccountNature.Liability, sortOrder: 124 }),

  H({ key: 'BS.EL.CL', label: 'Current Liabilities', statement: 'BS', section: 'EQ_LIAB', parent: null, nature: AccountNature.Liability, sortOrder: 130 }),
  H({ key: 'BS.EL.CL.STB', label: 'Short-term borrowings', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.CL', nature: AccountNature.Liability, sortOrder: 131, noteRef: 4 }),
  H({ key: 'BS.EL.CL.TP', label: 'Trade payables', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.CL', nature: AccountNature.Liability, sortOrder: 132, noteRef: 5 }),
  H({ key: 'BS.EL.CL.OTH', label: 'Other current liabilities', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.CL', nature: AccountNature.Liability, sortOrder: 133 }),
  H({ key: 'BS.EL.CL.PROV', label: 'Short-term provisions', statement: 'BS', section: 'EQ_LIAB', parent: 'BS.EL.CL', nature: AccountNature.Liability, sortOrder: 134 }),

  // ══════════════ BALANCE SHEET — ASSETS ════════════════════════════════
  H({ key: 'BS.AS.NCA', label: 'Non-Current Assets', statement: 'BS', section: 'ASSET', parent: null, nature: AccountNature.Asset, sortOrder: 200 }),
  H({ key: 'BS.AS.NCA.PPE', label: 'Property, Plant and Equipment', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 201, noteRef: 6 }),
  H({ key: 'BS.AS.NCA.INTAN', label: 'Intangible assets', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 202, noteRef: 6 }),
  H({ key: 'BS.AS.NCA.CWIP', label: 'Capital work-in-progress', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 203 }),
  H({ key: 'BS.AS.NCA.INV', label: 'Non-current investments', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 204, noteRef: 7 }),
  H({ key: 'BS.AS.NCA.DTA', label: 'Deferred tax assets (net)', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 205 }),
  H({ key: 'BS.AS.NCA.LTLA', label: 'Long-term loans and advances', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 206 }),
  H({ key: 'BS.AS.NCA.OTH', label: 'Other non-current assets', statement: 'BS', section: 'ASSET', parent: 'BS.AS.NCA', nature: AccountNature.Asset, sortOrder: 207 }),

  H({ key: 'BS.AS.CA', label: 'Current Assets', statement: 'BS', section: 'ASSET', parent: null, nature: AccountNature.Asset, sortOrder: 210 }),
  H({ key: 'BS.AS.CA.INV', label: 'Current investments', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 211 }),
  H({ key: 'BS.AS.CA.STK', label: 'Inventories', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 212, noteRef: 8 }),
  H({ key: 'BS.AS.CA.TR', label: 'Trade receivables', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 213, noteRef: 9 }),
  H({ key: 'BS.AS.CA.CCE', label: 'Cash and cash equivalents', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 214, noteRef: 10 }),
  H({ key: 'BS.AS.CA.STLA', label: 'Short-term loans and advances', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 215 }),
  H({ key: 'BS.AS.CA.OTH', label: 'Other current assets', statement: 'BS', section: 'ASSET', parent: 'BS.AS.CA', nature: AccountNature.Asset, sortOrder: 216 }),

  // ══════════════ STATEMENT OF PROFIT & LOSS ════════════════════════════
  H({ key: 'PL.INC.REV', label: 'Revenue from Operations', statement: 'PL', section: 'INCOME', parent: null, nature: AccountNature.Income, sortOrder: 300, noteRef: 11 }),
  H({ key: 'PL.INC.OTH', label: 'Other Income', statement: 'PL', section: 'INCOME', parent: null, nature: AccountNature.Income, sortOrder: 301, noteRef: 12 }),

  H({ key: 'PL.EXP.MAT', label: 'Cost of materials consumed', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 310 }),
  H({ key: 'PL.EXP.PUR', label: 'Purchases of Stock-in-Trade', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 311 }),
  H({ key: 'PL.EXP.CHG', label: 'Changes in inventories of finished goods, WIP and Stock-in-Trade', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 312 }),
  H({ key: 'PL.EXP.EMP', label: 'Employee benefits expense', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 313, noteRef: 13 }),
  H({ key: 'PL.EXP.FIN', label: 'Finance costs', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 314, noteRef: 14 }),
  H({ key: 'PL.EXP.DEP', label: 'Depreciation and amortization expense', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 315 }),
  H({ key: 'PL.EXP.OTH', label: 'Other expenses', statement: 'PL', section: 'EXPENSE', parent: null, nature: AccountNature.Expense, sortOrder: 316, noteRef: 15 }),

  H({ key: 'PL.EXC', label: 'Exceptional items', statement: 'PL', section: 'EXCEPTIONAL', parent: null, nature: AccountNature.Expense, sortOrder: 320 }),
  H({ key: 'PL.TAX.CUR', label: 'Current tax', statement: 'PL', section: 'TAX', parent: null, nature: AccountNature.Expense, sortOrder: 330 }),
  H({ key: 'PL.TAX.DEF', label: 'Deferred tax', statement: 'PL', section: 'TAX', parent: null, nature: AccountNature.Expense, sortOrder: 331 }),
]);

export function scheduleLabel(key: string, division: ScheduleIIIDivision): string {
  const head = SCHEDULE_III_MAP[key];
  if (!head) return key;
  if (division === ScheduleIIIDivision.DivisionII && head.divIILabel) return head.divIILabel;
  return head.label;
}

/** Children of a head, ordered. */
export function childrenOf(parentKey: string | null): ScheduleHead[] {
  return Object.values(SCHEDULE_III_MAP)
    .filter((h) => h.parent === parentKey)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
