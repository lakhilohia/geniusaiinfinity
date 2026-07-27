// ─────────────────────────────────────────────────────────────────────────
// Domain enums & DTOs shared between the Electron main process (DB/engine)
// and the React renderer (which never imports TypeORM directly).
// ─────────────────────────────────────────────────────────────────────────

/** Fundamental nature of an account, driving Dr/Cr normal balance and
 *  which financial statement it lands in. */
export enum AccountNature {
  Asset = 'ASSET',
  Liability = 'LIABILITY',
  Equity = 'EQUITY',
  Income = 'INCOME',
  Expense = 'EXPENSE',
}

/** The Tally-style primary voucher types. */
export enum VoucherType {
  Sales = 'SALES',
  Purchase = 'PURCHASE',
  Payment = 'PAYMENT',
  Receipt = 'RECEIPT',
  Contra = 'CONTRA',
  Journal = 'JOURNAL',
  DebitNote = 'DEBIT_NOTE',
  CreditNote = 'CREDIT_NOTE',
  StockJournal = 'STOCK_JOURNAL',
}

export type DrCr = 'DR' | 'CR';

/** Which Division of Schedule III to the Companies Act, 2013 applies. */
export enum ScheduleIIIDivision {
  DivisionI = 'DIV_I', // Companies not applying Ind AS (IGAAP)
  DivisionII = 'DIV_II', // Companies applying Ind AS (Ind AS 1 / AS-108)
}

/** GST supply nature derived from Place of Supply vs. State of Registration. */
export enum SupplyType {
  Intra = 'INTRA', // CGST + SGST
  Inter = 'INTER', // IGST
  Exempt = 'EXEMPT',
  NilRated = 'NIL',
  Export = 'EXPORT',
}

export interface GstBreakup {
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  cess: string;
  rate: number; // total GST rate applied, e.g. 18
  supplyType: SupplyType;
}

export interface LedgerBalance {
  ledgerId: string;
  name: string;
  groupId: string;
  debit: string;
  credit: string;
  closing: string; // signed: +Dr / -Cr
  nature: AccountNature;
}

/** A node in a report tree (Balance Sheet / P&L). Supports drill-down:
 *  Report line -> child group -> ledger -> voucher. */
export interface ReportNode {
  key: string;
  label: string;
  amount: string;
  level: number;
  scheduleRef?: string; // Schedule III sub-head reference
  noteRef?: number; // Note number in notes to accounts
  ledgerId?: string; // set on leaf ledger lines to enable drill-through
  children?: ReportNode[];
}

export interface FinancialStatement {
  title: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  division: ScheduleIIIDivision;
  nodes: ReportNode[];
  total: string;
}

export interface RatioResult {
  name: string;
  value: string;
  numerator: string;
  denominator: string;
  formula: string;
  pctChangeYoY?: string; // Schedule III requires % variance + explanation >25%
}
