import { AccountNature } from '../../shared/types';

/**
 * Default chart of accounts. Each group is pre-mapped to a Schedule III
 * sub-head so a fresh company produces a compliant Balance Sheet & P&L out of
 * the box. Mirrors Tally's reserved primary groups where sensible.
 */
export interface SeedGroup {
  name: string;
  parent?: string;
  nature: AccountNature;
  scheduleKey?: string;
  isPrimary?: boolean;
}

export const DEFAULT_GROUPS: SeedGroup[] = [
  // ── Capital & reserves ────────────────────────────────────────────────
  { name: 'Capital Account', nature: AccountNature.Equity, scheduleKey: 'BS.EL.SHF.CAP', isPrimary: true },
  { name: 'Share Capital', parent: 'Capital Account', nature: AccountNature.Equity, scheduleKey: 'BS.EL.SHF.CAP' },
  { name: 'Reserves & Surplus', nature: AccountNature.Equity, scheduleKey: 'BS.EL.SHF.RES', isPrimary: true },
  { name: 'Share Application Money', nature: AccountNature.Equity, scheduleKey: 'BS.EL.SAM' },

  // ── Liabilities ───────────────────────────────────────────────────────
  { name: 'Loans (Liability)', nature: AccountNature.Liability, scheduleKey: 'BS.EL.NCL.LTB', isPrimary: true },
  { name: 'Secured Loans', parent: 'Loans (Liability)', nature: AccountNature.Liability, scheduleKey: 'BS.EL.NCL.LTB' },
  { name: 'Unsecured Loans', parent: 'Loans (Liability)', nature: AccountNature.Liability, scheduleKey: 'BS.EL.NCL.LTB' },
  { name: 'Bank OD / CC A/c', parent: 'Loans (Liability)', nature: AccountNature.Liability, scheduleKey: 'BS.EL.CL.STB' },
  { name: 'Deferred Tax Liability', nature: AccountNature.Liability, scheduleKey: 'BS.EL.NCL.DTL' },
  { name: 'Long-term Provisions', nature: AccountNature.Liability, scheduleKey: 'BS.EL.NCL.PROV' },

  { name: 'Current Liabilities', nature: AccountNature.Liability, scheduleKey: 'BS.EL.CL.OTH', isPrimary: true },
  { name: 'Sundry Creditors', parent: 'Current Liabilities', nature: AccountNature.Liability, scheduleKey: 'BS.EL.CL.TP' },
  { name: 'Duties & Taxes', parent: 'Current Liabilities', nature: AccountNature.Liability, scheduleKey: 'BS.EL.CL.OTH' },
  { name: 'Provisions', parent: 'Current Liabilities', nature: AccountNature.Liability, scheduleKey: 'BS.EL.CL.PROV' },

  // ── Assets ────────────────────────────────────────────────────────────
  { name: 'Fixed Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.NCA.PPE', isPrimary: true },
  { name: 'Intangible Assets', parent: 'Fixed Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.NCA.INTAN' },
  { name: 'Investments', nature: AccountNature.Asset, scheduleKey: 'BS.AS.NCA.INV', isPrimary: true },
  { name: 'Long-term Loans & Advances', nature: AccountNature.Asset, scheduleKey: 'BS.AS.NCA.LTLA' },

  { name: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.OTH', isPrimary: true },
  { name: 'Stock-in-Hand', parent: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.STK' },
  { name: 'Sundry Debtors', parent: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.TR' },
  { name: 'Cash-in-Hand', parent: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.CCE' },
  { name: 'Bank Accounts', parent: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.CCE' },
  { name: 'Loans & Advances (Asset)', parent: 'Current Assets', nature: AccountNature.Asset, scheduleKey: 'BS.AS.CA.STLA' },

  // ── Income ────────────────────────────────────────────────────────────
  { name: 'Sales Accounts', nature: AccountNature.Income, scheduleKey: 'PL.INC.REV', isPrimary: true },
  { name: 'Direct Incomes', nature: AccountNature.Income, scheduleKey: 'PL.INC.REV', isPrimary: true },
  { name: 'Indirect Incomes', nature: AccountNature.Income, scheduleKey: 'PL.INC.OTH', isPrimary: true },

  // ── Expenses ──────────────────────────────────────────────────────────
  { name: 'Purchase Accounts', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.PUR', isPrimary: true },
  { name: 'Direct Expenses', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.MAT', isPrimary: true },
  { name: 'Employee Benefits', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.EMP' },
  { name: 'Finance Costs', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.FIN' },
  { name: 'Depreciation', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.DEP' },
  { name: 'Indirect Expenses', nature: AccountNature.Expense, scheduleKey: 'PL.EXP.OTH', isPrimary: true },
  { name: 'Current Tax', nature: AccountNature.Expense, scheduleKey: 'PL.TAX.CUR' },
  { name: 'Deferred Tax', nature: AccountNature.Expense, scheduleKey: 'PL.TAX.DEF' },
];
