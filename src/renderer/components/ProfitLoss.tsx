import React, { useEffect, useState } from 'react';
import { formatINR } from '../../shared/money';
import { api } from '../api';
import { ReportTree } from './ReportTree';
import type { ProfitLossResult } from '../../reports/profit-loss';

interface Props { companyId: string; fromDate: string; toDate: string; }

/** Statement of Profit & Loss (Revised Schedule III) with drill-down. */
export function ProfitLoss({ companyId, fromDate, toDate }: Props) {
  const [data, setData] = useState<ProfitLossResult | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    api.profitLoss(companyId, fromDate, toDate).then(setData).catch((e) => setErr(e.message));
  }, [companyId, fromDate, toDate]);

  if (err) return <div className="error">P&amp;L error: {err}</div>;
  if (!data) return <div className="loading">Preparing Statement of Profit &amp; Loss…</div>;

  const exportReport = async (kind: 'pdf' | 'excel') => {
    const payload = { statements: [data], suggestedName: `Profit-Loss-${toDate}.${kind === 'pdf' ? 'pdf' : 'xlsx'}` };
    const res = await (kind === 'pdf' ? api.exportPdf : api.exportExcel)(payload);
    if (res.saved) alert(`Saved to ${res.filePath}`);
  };

  return (
    <div className="statement">
      <header className="statement-head">
        <div>
          <h2>{data.companyName}</h2>
          <p className="muted">
            Statement of Profit and Loss for the period {fromDate} to {toDate}
          </p>
        </div>
        <div className="toolbar">
          <button onClick={() => exportReport('pdf')}>Export PDF</button>
          <button onClick={() => exportReport('excel')}>Export Excel</button>
        </div>
      </header>

      <ReportTree nodes={data.nodes} toDate={toDate} amountLabel="Amount (₹)" />

      <div className="kpi-strip">
        <Kpi label="Total Income" value={data.totalIncome} />
        <Kpi label="Total Expenses" value={data.totalExpenses} />
        <Kpi label="Profit Before Tax" value={data.pbt} />
        <Kpi label="Tax (Current + Deferred)" value={String(Number(data.taxCurrent) + Number(data.taxDeferred))} />
        <Kpi label="Profit After Tax" value={data.pat} highlight />
        <Kpi label="EPS (₹)" value={data.eps} />
      </div>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`kpi ${highlight ? 'kpi-hl' : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{formatINR(value, { showZero: true })}</span>
    </div>
  );
}
