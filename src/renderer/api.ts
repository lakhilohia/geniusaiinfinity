import type {
  FinancialStatement, RatioResult, LedgerBalance,
} from '../shared/types';
import type { ProfitLossResult } from '../reports/profit-loss';

// Mirrors the ExposedApi surface from electron/preload.ts. Every call returns
// an { ok, data | error } envelope; unwrap() throws on failure so components
// can use try/catch or error boundaries.
interface Envelope<T> { ok: boolean; data?: T; error?: string; }

declare global {
  interface Window {
    api: {
      listCompanies(): Promise<Envelope<string[]>>;
      createCompany(input: unknown): Promise<Envelope<any>>;
      openCompany(id: string, key?: string): Promise<Envelope<any>>;
      listLedgers(): Promise<Envelope<any[]>>;
      postVoucher(input: unknown): Promise<Envelope<any>>;
      listVouchers(filter?: unknown): Promise<Envelope<any[]>>;
      ledgerVouchers(ledgerId: string, toDate: string): Promise<Envelope<any[]>>;
      balanceSheet(companyId: string, toDate: string): Promise<Envelope<{ liabilities: FinancialStatement; assets: FinancialStatement }>>;
      profitLoss(companyId: string, fromDate: string, toDate: string): Promise<Envelope<ProfitLossResult>>;
      ratios(companyId: string, fromDate: string, toDate: string): Promise<Envelope<RatioResult[]>>;
      trialBalance(companyId: string, toDate: string): Promise<Envelope<{ balances: LedgerBalance[]; totals: any }>>;
      importTally(xml: string): Promise<Envelope<any>>;
      exportTally(companyId: string): Promise<Envelope<string>>;
      exportPdf(payload: unknown): Promise<Envelope<{ saved: boolean; filePath?: string }>>;
      exportExcel(payload: unknown): Promise<Envelope<{ saved: boolean; filePath?: string }>>;
      computeGst(input: unknown): Promise<Envelope<any>>;
      computeTds(input: unknown): Promise<Envelope<any>>;
    };
  }
}

async function unwrap<T>(p: Promise<Envelope<T>>): Promise<T> {
  const res = await p;
  if (!res.ok) throw new Error(res.error ?? 'Unknown error');
  return res.data as T;
}

export const api = {
  listCompanies: () => unwrap(window.api.listCompanies()),
  openCompany: (id: string, key?: string) => unwrap(window.api.openCompany(id, key)),
  createCompany: (input: unknown) => unwrap(window.api.createCompany(input)),
  listLedgers: () => unwrap(window.api.listLedgers()),
  postVoucher: (input: unknown) => unwrap(window.api.postVoucher(input)),
  ledgerVouchers: (ledgerId: string, toDate: string) => unwrap(window.api.ledgerVouchers(ledgerId, toDate)),
  balanceSheet: (companyId: string, toDate: string) => unwrap(window.api.balanceSheet(companyId, toDate)),
  profitLoss: (companyId: string, from: string, to: string) => unwrap(window.api.profitLoss(companyId, from, to)),
  ratios: (companyId: string, from: string, to: string) => unwrap(window.api.ratios(companyId, from, to)),
  trialBalance: (companyId: string, toDate: string) => unwrap(window.api.trialBalance(companyId, toDate)),
  exportPdf: (payload: unknown) => unwrap(window.api.exportPdf(payload)),
  exportExcel: (payload: unknown) => unwrap(window.api.exportExcel(payload)),
  importTally: (xml: string) => unwrap(window.api.importTally(xml)),
};
