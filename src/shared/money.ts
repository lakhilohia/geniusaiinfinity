import Decimal from 'decimal.js';

// All monetary math flows through Decimal to avoid IEEE-754 rounding drift.
// Amounts are stored in the DB as strings (TypeORM `numeric`) and rehydrated
// here. Indian statutory rounding is "round half up" to 2 decimals for money
// and to whole rupees for tax computation where the Act requires it.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;

export const money = (v: string | number | Decimal | null | undefined): Money =>
  new Decimal(v ?? 0);

export const ZERO = new Decimal(0);

/** Round to paise (2 dp) — the canonical precision for ledger balances. */
export const toPaise = (v: Decimal): Decimal => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Round to nearest whole rupee — used for GST/TDS statutory rounding. */
export const toRupee = (v: Decimal): Decimal => v.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);

/** Serialise for persistence (fixed 2dp string keeps numeric column stable). */
export const store = (v: Decimal): string => toPaise(v).toFixed(2);

/** Human display: Indian grouping, e.g. 12,34,567.89 */
export function formatINR(v: Decimal | string | number, opts?: { showZero?: boolean }): string {
  const d = money(v);
  if (d.isZero() && opts?.showZero === false) return '';
  const neg = d.isNegative();
  const [intPart, decPart] = d.abs().toFixed(2).split('.');
  // Indian digit grouping: last 3 digits, then groups of 2.
  let grouped = intPart;
  if (intPart.length > 3) {
    const last3 = intPart.slice(-3);
    const rest = intPart.slice(0, -3);
    grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  }
  return `${neg ? '-' : ''}${grouped}.${decPart}`;
}
