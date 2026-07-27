import { DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { money, store, ZERO } from '../shared/money';
import { AccountNature, LedgerBalance } from '../shared/types';
import { Ledger } from '../db/entities/Ledger';
import { AccountGroup } from '../db/entities/AccountGroup';

export interface BalanceOptions {
  companyId: string;
  toDate: string; // inclusive
  fromDate?: string; // if set, movement-only (used for P&L period figures)
  includeOptional?: boolean;
}

/** A ledger with its resolved effective Schedule III key and nature. */
export interface ResolvedLedger extends LedgerBalance {
  scheduleKey: string | null;
  isRevenueLedger: boolean;
  isMsme: boolean;
  isRelatedParty: boolean;
}

/**
 * Computes closing balances per ledger by summing signed voucher entries
 * (+Dr / -Cr) up to `toDate`, added to opening balances. When `fromDate` is
 * supplied only the movement within the window is returned — this is how the
 * P&L (which needs period figures, not cumulative) is driven, while the
 * Balance Sheet uses cumulative-to-date.
 *
 * Runs a single SQL aggregation for scale, then joins group ancestry in memory
 * to resolve each ledger's effective Schedule III sub-head.
 */
export async function computeLedgerBalances(
  ds: DataSource, opts: BalanceOptions,
): Promise<ResolvedLedger[]> {
  const { companyId, toDate, fromDate, includeOptional } = opts;

  const ledgers = await ds.getRepository(Ledger).find({ where: { companyId } });
  const groups = await ds.getRepository(AccountGroup).find({ where: { companyId } });
  const groupById = new Map(groups.map((g) => [g.id, g]));

  // Aggregate signed movements per ledger in one pass.
  const qb = ds
    .createQueryBuilder()
    .select('e.ledgerId', 'ledgerId')
    .addSelect(`SUM(CASE WHEN e.drCr = 'DR' THEN CAST(e.amount AS REAL) ELSE 0 END)`, 'debit')
    .addSelect(`SUM(CASE WHEN e.drCr = 'CR' THEN CAST(e.amount AS REAL) ELSE 0 END)`, 'credit')
    .from('voucher_entries', 'e')
    .innerJoin('vouchers', 'v', 'v.id = e.voucherId')
    .where('v.companyId = :companyId', { companyId })
    .andWhere('v.isCancelled = 0')
    .andWhere('v.date <= :toDate', { toDate })
    .groupBy('e.ledgerId');

  if (!includeOptional) qb.andWhere('v.isOptional = 0');
  if (fromDate) qb.andWhere('v.date >= :fromDate', { fromDate });

  const rows = await qb.getRawMany<{ ledgerId: string; debit: number; credit: number }>();
  const movementById = new Map(rows.map((r) => [r.ledgerId, r]));

  return ledgers.map((led) => {
    const grp = groupById.get(led.groupId);
    const nature = grp?.nature ?? AccountNature.Asset;
    const mv = movementById.get(led.id);

    // Opening balance excluded when computing movement-only (P&L) figures.
    const opening = fromDate ? ZERO : money(led.openingBalance);
    const debit = money(mv?.debit ?? 0);
    const credit = money(mv?.credit ?? 0);
    const closing: Decimal = opening.plus(debit).minus(credit); // signed +Dr/-Cr

    return {
      ledgerId: led.id,
      name: led.name,
      groupId: led.groupId,
      debit: store(debit),
      credit: store(credit),
      closing: store(closing),
      nature,
      scheduleKey: resolveScheduleKey(grp, groupById),
      isRevenueLedger: led.isRevenueLedger,
      isMsme: led.isMsme,
      isRelatedParty: led.isRelatedParty,
    };
  });
}

/** Walk group ancestry until a scheduleKey is found (inheritance). */
export function resolveScheduleKey(
  group: AccountGroup | undefined,
  groupById: Map<string, AccountGroup>,
): string | null {
  let cur = group;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    if (cur.scheduleKey) return cur.scheduleKey;
    seen.add(cur.id);
    cur = cur.parentId ? groupById.get(cur.parentId) : undefined;
  }
  return null;
}

/** Classic trial balance: totals must be equal (Σ Dr closing = Σ Cr closing). */
export function trialBalanceTotals(balances: ResolvedLedger[]): { debit: string; credit: string; balanced: boolean } {
  let dr = ZERO;
  let cr = ZERO;
  for (const b of balances) {
    const c = money(b.closing);
    if (c.isPositive()) dr = dr.plus(c);
    else cr = cr.plus(c.abs());
  }
  return { debit: store(dr), credit: store(cr), balanced: dr.minus(cr).abs().lessThan(0.01) };
}
