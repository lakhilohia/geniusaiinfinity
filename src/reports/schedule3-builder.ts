import { Decimal } from 'decimal.js';
import { money, store, ZERO } from '../shared/money';
import { ReportNode, ScheduleIIIDivision } from '../shared/types';
import { ResolvedLedger } from '../engine/trial-balance';
import { SCHEDULE_III_MAP, Section, Statement, scheduleLabel, childrenOf } from '../engine/schedule3';

/**
 * Assemble a drill-downable ReportNode tree for a set of Schedule III sub-heads.
 *
 * The tree has three levels the UI can expand:
 *   sub-head (e.g. "Reserves & Surplus")
 *     └─ ledger line (e.g. "General Reserve")   ← ledgerId set → drill to vouchers
 *
 * `signFor` converts the signed closing balance (+Dr / -Cr) into the amount as
 * it should appear on that side of the statement. Liabilities/Equity/Income are
 * naturally credit balances, so we negate; Assets/Expenses are debit balances.
 */
export function buildScheduleTree(
  balances: ResolvedLedger[],
  opts: {
    statement: Statement;
    sections: Section[];
    division: ScheduleIIIDivision;
    signFor: (b: ResolvedLedger) => Decimal;
  },
): { nodes: ReportNode[]; total: Decimal } {
  // Bucket ledgers by their resolved schedule key.
  const byKey = new Map<string, ResolvedLedger[]>();
  for (const b of balances) {
    if (!b.scheduleKey) continue;
    const head = SCHEDULE_III_MAP[b.scheduleKey];
    if (!head || head.statement !== opts.statement || !opts.sections.includes(head.section)) continue;
    (byKey.get(b.scheduleKey) ?? byKey.set(b.scheduleKey, []).get(b.scheduleKey)!).push(b);
  }

  // Recursively build from top-level heads (parent === null) in the sections.
  const roots = childrenOf(null).filter(
    (h) => h.statement === opts.statement && opts.sections.includes(h.section),
  );

  let grandTotal = ZERO;
  const nodes: ReportNode[] = [];

  const buildHead = (key: string, level: number): ReportNode | null => {
    const head = SCHEDULE_III_MAP[key];
    const children: ReportNode[] = [];
    let sum = ZERO;

    // Ledger leaves directly under this head.
    for (const led of byKey.get(key) ?? []) {
      const amt = opts.signFor(led);
      if (amt.isZero()) continue;
      sum = sum.plus(amt);
      children.push({
        key: `${key}:${led.ledgerId}`,
        label: led.name,
        amount: store(amt),
        level: level + 1,
        ledgerId: led.ledgerId,
      });
    }

    // Sub-heads.
    for (const child of childrenOf(key)) {
      const node = buildHead(child.key, level + 1);
      if (node) {
        sum = sum.plus(money(node.amount));
        children.push(node);
      }
    }

    if (children.length === 0) return null;
    children.sort((a, b) => (a.ledgerId ? 1 : 0) - (b.ledgerId ? 1 : 0));

    return {
      key,
      label: scheduleLabel(key, opts.division),
      amount: store(sum),
      level,
      scheduleRef: key,
      noteRef: head.noteRef,
      children,
    };
  };

  for (const root of roots) {
    const node = buildHead(root.key, 0);
    if (node) {
      grandTotal = grandTotal.plus(money(node.amount));
      nodes.push(node);
    }
  }

  return { nodes, total: grandTotal };
}
