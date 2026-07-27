import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { money, ZERO } from '../shared/money';
import { AccountNature, RatioResult } from '../shared/types';
import { computeLedgerBalances, ResolvedLedger } from '../engine/trial-balance';
import { buildProfitLoss } from './profit-loss';

/**
 * The 11 ratios whose disclosure is mandated by Schedule III (2021 amendment).
 * Where a strict figure needs opening + closing averaging, we approximate with
 * closing balances when no comparative is loaded; the UI flags any YoY variance
 * exceeding 25% (which the Act requires to be explained).
 */
export async function computeStatutoryRatios(
  ds: DataSource, companyId: string, fromDate: string, toDate: string,
): Promise<RatioResult[]> {
  const balances = await computeLedgerBalances(ds, { companyId, toDate });
  const pl = await buildProfitLoss(ds, companyId, fromDate, toDate);

  // Balances by schedule-key prefix (credit-natured negated to positive).
  const sumByPrefix = (prefix: string): Decimal =>
    balances
      .filter((b) => b.scheduleKey?.startsWith(prefix))
      .reduce((acc, b) => {
        const signed = money(b.closing);
        const positive = isCreditNature(b) ? signed.negated() : signed;
        return acc.plus(positive);
      }, ZERO);

  const currentAssets = sumByPrefix('BS.AS.CA');
  const currentLiab = sumByPrefix('BS.EL.CL');
  const inventory = sumByPrefix('BS.AS.CA.STK');
  const receivables = sumByPrefix('BS.AS.CA.TR');
  const payables = sumByPrefix('BS.EL.CL.TP');
  const equity = sumByPrefix('BS.EL.SHF').plus(money(pl.pat)); // include current surplus
  const longTermDebt = sumByPrefix('BS.EL.NCL.LTB');
  const shortTermDebt = sumByPrefix('BS.EL.CL.STB');
  const totalDebt = longTermDebt.plus(shortTermDebt);
  const investments = sumByPrefix('BS.AS.NCA.INV').plus(sumByPrefix('BS.AS.CA.INV'));

  const revenue = money(pl.totalIncome);
  const pat = money(pl.pat);
  const financeCost = headAmount(pl, 'Finance costs');
  const depreciation = headAmount(pl, 'Depreciation');
  const ebit = pat.plus(money(pl.taxCurrent)).plus(money(pl.taxDeferred)).plus(financeCost);
  const cogs = money(pl.totalExpenses).minus(financeCost).minus(depreciation);
  const workingCapital = currentAssets.minus(currentLiab);
  const capitalEmployed = equity.plus(longTermDebt);

  const R = (
    name: string, num: Decimal, den: Decimal, formula: string,
  ): RatioResult => ({
    name,
    numerator: num.toFixed(2),
    denominator: den.toFixed(2),
    value: den.isZero() ? '—' : num.div(den).toFixed(2),
    formula,
  });

  return [
    R('Current Ratio', currentAssets, currentLiab, 'Current Assets / Current Liabilities'),
    R('Debt-Equity Ratio', totalDebt, equity, 'Total Debt / Shareholders’ Equity'),
    R('Debt Service Coverage Ratio', ebit.plus(depreciation), financeCost.plus(shortTermDebt),
      '(EBIT + Depreciation) / (Interest + Principal repayments)'),
    R('Return on Equity (%)', pat.times(100), equity, 'Net Profit after Tax / Average Equity × 100'),
    R('Inventory Turnover Ratio', cogs, inventory, 'Cost of Goods Sold / Average Inventory'),
    R('Trade Receivables Turnover Ratio', revenue, receivables, 'Net Credit Sales / Average Trade Receivables'),
    R('Trade Payables Turnover Ratio', cogs, payables, 'Net Credit Purchases / Average Trade Payables'),
    R('Net Capital Turnover Ratio', revenue, workingCapital, 'Revenue / Working Capital'),
    R('Net Profit Ratio (%)', pat.times(100), revenue, 'Net Profit after Tax / Revenue × 100'),
    R('Return on Capital Employed (%)', ebit.times(100), capitalEmployed, 'EBIT / Capital Employed × 100'),
    R('Return on Investment (%)', money(pl.totalIncome).minus(revenue).times(100).abs(), investments,
      'Income from Investments / Investments × 100'),
  ];
}

function isCreditNature(b: ResolvedLedger): boolean {
  return b.nature === AccountNature.Liability
    || b.nature === AccountNature.Equity
    || b.nature === AccountNature.Income;
}

function headAmount(pl: { nodes: { label: string; amount: string; children?: any[] }[] }, needle: string): Decimal {
  const walk = (nodes: any[]): Decimal => {
    for (const n of nodes) {
      if (String(n.label).includes(needle)) return money(n.amount);
      if (n.children) {
        const found = walk(n.children);
        if (!found.isZero()) return found;
      }
    }
    return ZERO;
  };
  return walk(pl.nodes);
}
