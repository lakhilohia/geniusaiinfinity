import React, { useEffect, useState } from 'react';
import { FinancialStatement } from '../../shared/types';
import { formatINR } from '../../shared/money';
import { api } from '../api';
import { ReportTree } from './ReportTree';

interface Props { companyId: string; toDate: string; }

/**
 * Revised Schedule III Balance Sheet — Equity & Liabilities on the left,
 * Assets on the right, each fully drill-downable to voucher level. The two
 * totals must agree (the report engine folds current-year profit into
 * Reserves & Surplus to make them tie).
 */
export function BalanceSheet({ companyId, toDate }: Props) {
  const [data, setData] = useState<{ liabilities: FinancialStatement; assets: FinancialStatement } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setErr(null);
    api.balanceSheet(companyId, toDate).then(setData).catch((e) => setErr(e.message));
  }, [companyId, toDate]);

  if (err) return <div className="error">Balance Sheet error: {err}</div>;
  if (!data) return <div className="loading">Preparing Balance Sheet…</div>;

  const tied = data.liabilities.total === data.assets.total;

  const exportReport = async (kind: 'pdf' | 'excel') => {
    const payload = {
      statements: [data.liabilities, data.assets],
      suggestedName: `Balance-Sheet-${toDate}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`,
    };
    const fn = kind === 'pdf' ? api.exportPdf : api.exportExcel;
    const res = await fn(payload);
    if (res.saved) alert(`Saved to ${res.filePath}`);
  };

  return (
    <div className="statement">
      <header className="statement-head">
        <div>
          <h2>{data.liabilities.companyName}</h2>
          <p className="muted">
            Balance Sheet as at {toDate} —{' '}
            {data.liabilities.division === 'DIV_II' ? 'Division II (Ind AS)' : 'Division I (IGAAP)'}
          </p>
        </div>
        <div className="toolbar">
          <button onClick={() => exportReport('pdf')}>Export PDF</button>
          <button onClick={() => exportReport('excel')}>Export Excel</button>
        </div>
      </header>

      {!tied && (
        <div className="warn">
          ⚠ Balance Sheet does not tie — Equity &amp; Liabilities {formatINR(data.liabilities.total)} vs
          Assets {formatINR(data.assets.total)}. Check suspense / unposted entries.
        </div>
      )}

      <div className="bs-grid">
        <section>
          <h3>I. Equity and Liabilities</h3>
          <ReportTree nodes={data.liabilities.nodes} toDate={toDate} />
          <TotalRow label="Total Equity & Liabilities" value={data.liabilities.total} />
        </section>
        <section>
          <h3>II. Assets</h3>
          <ReportTree nodes={data.assets.nodes} toDate={toDate} />
          <TotalRow label="Total Assets" value={data.assets.total} />
        </section>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="total-row">
      <span>{label}</span>
      <span>{formatINR(value, { showZero: true })}</span>
    </div>
  );
}
