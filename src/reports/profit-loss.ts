import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { money, store, ZERO, formatINR } from '../shared/money';
import { AccountNature, FinancialStatement, ReportNode, ScheduleIIIDivision } from '../shared/types';
import { Company } from '../db/entities/Company';
import { computeLedgerBalances } from '../engine/trial-balance';
import { buildScheduleTree } from './schedule3-builder';

export interface ProfitLossResult extends FinancialStatement {
  totalIncome: string;
  totalExpenses: string;
  pbt: string; // Profit before exceptional items & tax
  exceptional: string;
  taxCurrent: string;
  taxDeferred: string;
  pat: string; // Profit after tax
  eps: string; // basic earnings per share
}

/**
 * Statement of Profit & Loss per Revised Schedule III, computed on PERIOD
 * movements (fromDate..toDate) rather than cumulative balances.
 */
export async function buildProfitLoss(
  ds: DataSource, companyId: string, fromDate: string, toDate: string,
): Promise<ProfitLossResult> {
  const company = await ds.getRepository(Company).findOneByOrFail({ id: companyId });
  const division = company.scheduleDivision as ScheduleIIIDivision;
  const balances = await computeLedgerBalances(ds, { companyId, fromDate, toDate });

  // Income section: credit-natured → negate signed closing to get positive income.
  const income = buildScheduleTree(balances, {
    statement: 'PL', sections: ['INCOME'], division,
    signFor: (b) => money(b.closing).negated(),
  });

  // Expenses: debit-natured → positive as-is. Excludes tax & exceptional heads.
  const expenses = buildScheduleTree(balances, {
    statement: 'PL', sections: ['EXPENSE'], division,
    signFor: (b) => money(b.closing),
  });

  const exceptional = buildScheduleTree(balances, {
    statement: 'PL', sections: ['EXCEPTIONAL'], division,
    signFor: (b) => money(b.closing),
  });

  const tax = buildScheduleTree(balances, {
    statement: 'PL', sections: ['TAX'], division,
    signFor: (b) => money(b.closing),
  });

  const totalIncome = income.total;
  const totalExpenses = expenses.total;
  const pbtBeforeExc = totalIncome.minus(totalExpenses);
  const exc = exceptional.total;
  const pbt = pbtBeforeExc.minus(exc);

  const taxCurrent = sumHead(tax.nodes, 'PL.TAX.CUR');
  const taxDeferred = sumHead(tax.nodes, 'PL.TAX.DEF');
  const pat = pbt.minus(taxCurrent).minus(taxDeferred);

  const shares = company.numberOfShares > 0 ? new Decimal(company.numberOfShares) : null;
  const eps = shares ? pat.div(shares) : ZERO;

  // Compose the presentation tree: Income block, Expense block, then the
  // computed sub-totals as flat nodes so the UI renders a full statement.
  const nodes: ReportNode[] = [
    sectionNode('I. Revenue', income.nodes, totalIncome, 0),
    line('II. Total Income (I)', totalIncome),
    sectionNode('III. Expenses', expenses.nodes, totalExpenses, 0),
    line('IV. Total Expenses (III)', totalExpenses),
    line('V. Profit before exceptional items and tax (II − IV)', pbtBeforeExc),
    ...(exc.isZero() ? [] : [line('VI. Exceptional Items', exc)]),
    line('VII. Profit before tax', pbt),
    ...(tax.nodes.length ? [sectionNode('VIII. Tax Expense', tax.nodes, taxCurrent.plus(taxDeferred), 0)] : []),
    line('IX. Profit for the period (PAT)', pat),
    line(`X. Earnings per equity share (Basic & Diluted) — ₹${formatINR(eps)}`, eps),
  ];

  return {
    title: 'Statement of Profit and Loss',
    companyName: company.name,
    fromDate, toDate, division,
    nodes,
    total: store(pat),
    totalIncome: store(totalIncome),
    totalExpenses: store(totalExpenses),
    pbt: store(pbt),
    exceptional: store(exc),
    taxCurrent: store(taxCurrent),
    taxDeferred: store(taxDeferred),
    pat: store(pat),
    eps: store(eps),
  };
}

function sumHead(nodes: ReportNode[], key: string): Decimal {
  const n = nodes.find((x) => x.scheduleRef === key);
  return n ? money(n.amount) : ZERO;
}

function line(label: string, amount: Decimal): ReportNode {
  return { key: label, label, amount: store(amount), level: 0 };
}

function sectionNode(label: string, children: ReportNode[], total: Decimal, level: number): ReportNode {
  return { key: label, label, amount: store(total), level, children };
}
