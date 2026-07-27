import { Decimal } from 'decimal.js';
import { money, toRupee, ZERO } from '../shared/money';

/**
 * TDS / TCS engine (Income-tax Act, 1961).
 *
 * Each section carries its threshold (single-bill and/or annual aggregate) and
 * the deduction rate. Where PAN is not furnished, Sec. 206AA applies the higher
 * of the specified rate or 20%. TCS sections (206C) are modelled the same way
 * with the "collection" semantics.
 */
export interface TdsSection {
  section: string;
  nature: string;
  rate: number; // % for individual/HUF where relevant
  rateOther?: number; // % for company/firm where the rate differs
  singleThreshold?: number; // per-transaction limit
  annualThreshold?: number; // aggregate FY limit
  isTcs?: boolean;
}

export const TDS_SECTIONS: Record<string, TdsSection> = {
  '194C': { section: '194C', nature: 'Payment to contractors', rate: 1, rateOther: 2, singleThreshold: 30000, annualThreshold: 100000 },
  '194J': { section: '194J', nature: 'Professional / technical fees', rate: 10, singleThreshold: 30000 },
  '194H': { section: '194H', nature: 'Commission or brokerage', rate: 5, annualThreshold: 15000 },
  '194I': { section: '194I', nature: 'Rent of land/building', rate: 10, annualThreshold: 240000 },
  '194Q': { section: '194Q', nature: 'Purchase of goods', rate: 0.1, annualThreshold: 5000000 },
  '194A': { section: '194A', nature: 'Interest other than securities', rate: 10, annualThreshold: 40000 },
  '206C(1H)': { section: '206C(1H)', nature: 'TCS on sale of goods', rate: 0.1, annualThreshold: 5000000, isTcs: true },
  '206C(1)': { section: '206C(1)', nature: 'TCS on scrap/minerals', rate: 1, isTcs: true },
};

export interface TdsInput {
  section: string;
  amount: string | number; // the current invoice/payment base
  aggregatePriorInFy?: string | number; // amounts already paid to this party this FY
  hasPan?: boolean; // false → Sec. 206AA higher rate
  isCompanyOrFirm?: boolean;
}

export interface TdsResult {
  section: string;
  applicable: boolean;
  reason: string;
  taxableBase: string;
  rate: number;
  tdsAmount: string;
  isTcs: boolean;
}

export function computeTds(input: TdsInput): TdsResult {
  const cfg = TDS_SECTIONS[input.section];
  const amount = money(input.amount);
  const prior = money(input.aggregatePriorInFy ?? 0);

  if (!cfg) {
    return notApplicable(input.section, amount, `Unknown section ${input.section}`);
  }

  // Threshold tests.
  const belowSingle = cfg.singleThreshold != null && amount.lessThanOrEqualTo(cfg.singleThreshold);
  const aggregate = prior.plus(amount);
  const belowAnnual = cfg.annualThreshold != null && aggregate.lessThanOrEqualTo(cfg.annualThreshold);

  // 194C special rule: deduct if EITHER single>30k OR annual>1L is breached.
  const thresholdBreached = cfg.singleThreshold != null && cfg.annualThreshold != null
    ? !belowSingle || !belowAnnual
    : (cfg.singleThreshold != null ? !belowSingle : true)
      && (cfg.annualThreshold != null ? !belowAnnual : true);

  if (!thresholdBreached) {
    return notApplicable(cfg.section, amount,
      `Below threshold (single ₹${cfg.singleThreshold ?? '—'}, annual ₹${cfg.annualThreshold ?? '—'})`);
  }

  // 194Q / 206C(1H): tax applies only on the amount exceeding the annual limit.
  let base = amount;
  if (cfg.annualThreshold != null && (cfg.section === '194Q' || cfg.section === '206C(1H)')) {
    const excessTotal = aggregate.minus(cfg.annualThreshold);
    base = Decimal.min(amount, excessTotal.isNegative() ? ZERO : excessTotal);
    if (base.lessThanOrEqualTo(0)) {
      return notApplicable(cfg.section, amount, 'No amount above annual threshold yet');
    }
  }

  let rate = input.isCompanyOrFirm && cfg.rateOther != null ? cfg.rateOther : cfg.rate;
  let reason = `${cfg.nature} @ ${rate}%`;
  if (input.hasPan === false && !cfg.isTcs) {
    rate = Math.max(rate, 20); // Sec. 206AA
    reason = `PAN not available — Sec. 206AA higher rate ${rate}%`;
  }

  const tds = toRupee(base.times(rate).div(100));
  return {
    section: cfg.section,
    applicable: true,
    reason,
    taxableBase: base.toFixed(2),
    rate,
    tdsAmount: tds.toFixed(2),
    isTcs: !!cfg.isTcs,
  };
}

function notApplicable(section: string, amount: Decimal, reason: string): TdsResult {
  return {
    section, applicable: false, reason,
    taxableBase: amount.toFixed(2), rate: 0, tdsAmount: '0.00', isTcs: false,
  };
}
