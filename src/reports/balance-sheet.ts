import { DataSource } from 'typeorm';
import { money, store } from '../shared/money';
import { AccountNature, FinancialStatement, ScheduleIIIDivision } from '../shared/types';
import { Company } from '../db/entities/Company';
import { computeLedgerBalances, ResolvedLedger } from '../engine/trial-balance';

/**
 * Revised Schedule III Balance Sheet.
 *
 * Equity & Liabilities are credit-natured → shown as the (negated) signed
 * closing. Assets are debit-natured → shown as-is. Current-period profit is
 * folded into Reserves & Surplus so the two sides tie out.
 */
export async function buildBalanceSheet(
  ds: DataSource, companyId: string, toDate: string,
): Promise<{ liabilities: FinancialStatement; assets: FinancialStatement }> {
  const company = await ds.getRepository(Company).findOneByOrFail({ id: companyId });
  const division = company.scheduleDivision as ScheduleIIIDivision;
  const balances = await computeLedgerBalances(ds, { companyId, toDate });

  // Current-year P&L result must sit inside Reserves & Surplus on the BS.
  const profit = balances
    .filter((b) => b.nature === AccountNature.Income || b.nature === AccountNature.Expense)
    .reduce((acc, b) => acc.plus(money(b.closing)), money(0));
  // Income raises credit (negative signed), expense raises debit (positive).
  // Net signed = expenses − income; profit = −netSigned. Inject as a synthetic
  // credit-balance ledger under Reserves & Surplus.
  const surplusLedger: ResolvedLedger = {
    ledgerId: '__pnl_surplus__',
    name: 'Profit & Loss A/c (current year surplus)',
    groupId: '',
    debit: '0.00',
    credit: '0.00',
    closing: store(profit), // profit is +Dr sign here → negated below to credit
    nature: AccountNature.Equity,
    scheduleKey: 'BS.EL.SHF.RES',
    isRevenueLedger: false,
    isMsme: false,
    isRelatedParty: false,
  };

  const bsBalances = balances
    .filter((b) => b.nature !== AccountNature.Income && b.nature !== AccountNature.Expense)
    .concat(surplusLedger);

  const { buildScheduleTree } = await import('./schedule3-builder');

  const liab = buildScheduleTree(bsBalances, {
    statement: 'BS',
    sections: ['EQ_LIAB'],
    division,
    // Liabilities/equity are credit balances → negate signed closing.
    signFor: (b) => money(b.closing).negated(),
  });

  const asset = buildScheduleTree(bsBalances, {
    statement: 'BS',
    sections: ['ASSET'],
    division,
    signFor: (b) => money(b.closing),
  });

  const base = {
    companyName: company.name,
    fromDate: company.fyStart,
    toDate,
    division,
  };

  return {
    liabilities: {
      ...base,
      title: 'Balance Sheet — Equity and Liabilities',
      nodes: liab.nodes,
      total: store(liab.total),
    },
    assets: {
      ...base,
      title: 'Balance Sheet — Assets',
      nodes: asset.nodes,
      total: store(asset.total),
    },
  };
}
