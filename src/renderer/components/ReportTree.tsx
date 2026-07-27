import React, { useState } from 'react';
import { ReportNode } from '../../shared/types';
import { formatINR } from '../../shared/money';
import { api } from '../api';

interface Props {
  nodes: ReportNode[];
  toDate: string;
  /** Column heading for the amount column. */
  amountLabel?: string;
}

/**
 * Renders a Schedule III statement tree with three-level drill-down:
 *   sub-head ⤵ ledger ⤵ vouchers
 * Group rows toggle their children; leaf ledger rows (ledgerId set) fetch and
 * inline the vouchers that produced the balance.
 */
export function ReportTree({ nodes, toDate, amountLabel = 'Amount (₹)' }: Props) {
  return (
    <table className="report-tree">
      <thead>
        <tr>
          <th>Particulars</th>
          <th className="col-note">Note</th>
          <th className="col-amt">{amountLabel}</th>
        </tr>
      </thead>
      <tbody>
        {nodes.map((n) => (
          <TreeRow key={n.key} node={n} toDate={toDate} />
        ))}
      </tbody>
    </table>
  );
}

function TreeRow({ node, toDate }: { node: ReportNode; toDate: string }) {
  const [open, setOpen] = useState(node.level === 0);
  const [vouchers, setVouchers] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const hasChildren = !!node.children?.length;
  const isLeafLedger = !!node.ledgerId;

  const toggle = async () => {
    if (hasChildren) { setOpen((o) => !o); return; }
    if (isLeafLedger) {
      if (vouchers) { setVouchers(null); return; }
      setLoading(true);
      try {
        setVouchers(await api.ledgerVouchers(node.ledgerId!, toDate));
      } finally {
        setLoading(false);
      }
    }
  };

  const clickable = hasChildren || isLeafLedger;

  return (
    <>
      <tr
        className={`lvl-${node.level} ${hasChildren ? 'head' : ''} ${clickable ? 'clickable' : ''}`}
        onClick={clickable ? toggle : undefined}
      >
        <td style={{ paddingLeft: 12 + node.level * 20 }}>
          {clickable && <span className="twisty">{open || vouchers ? '▾' : '▸'}</span>}
          {node.label}
          {isLeafLedger && <span className="drill-hint"> ↵ vouchers</span>}
        </td>
        <td className="col-note">{node.noteRef ?? ''}</td>
        <td className="col-amt">{formatINR(node.amount, { showZero: true })}</td>
      </tr>

      {loading && (
        <tr className="drill"><td colSpan={3} style={{ paddingLeft: 40 }}>Loading vouchers…</td></tr>
      )}

      {vouchers && vouchers.length > 0 && (
        <tr className="drill">
          <td colSpan={3}>
            <table className="voucher-drill">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Voucher No.</th><th>Narration</th><th className="col-amt">Amount</th></tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td>{v.date}</td>
                    <td>{v.type}</td>
                    <td>{v.voucherNumber}</td>
                    <td>{v.narration ?? ''}</td>
                    <td className="col-amt">{formatINR(v.amount, { showZero: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
      {vouchers && vouchers.length === 0 && (
        <tr className="drill"><td colSpan={3} style={{ paddingLeft: 40 }}>No vouchers in period.</td></tr>
      )}

      {open && node.children?.map((c) => <TreeRow key={c.key} node={c} toDate={toDate} />)}
    </>
  );
}
