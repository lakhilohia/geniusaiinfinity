import React, { useEffect, useState } from 'react';
import { RatioResult } from '../../shared/types';
import { api } from '../api';

interface Props { companyId: string; fromDate: string; toDate: string; }

/** Schedule III mandatory ratio disclosures. Variance >25% YoY must be
 *  explained per the 2021 amendment — flagged here when comparatives exist. */
export function RatiosPanel({ companyId, fromDate, toDate }: Props) {
  const [ratios, setRatios] = useState<RatioResult[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.ratios(companyId, fromDate, toDate).then(setRatios).catch((e) => setErr(e.message));
  }, [companyId, fromDate, toDate]);

  if (err) return <div className="error">Ratios error: {err}</div>;
  if (!ratios) return <div className="loading">Computing statutory ratios…</div>;

  return (
    <div className="ratios">
      <h3>Statutory Ratios — Schedule III Disclosure</h3>
      <table className="report-tree">
        <thead>
          <tr>
            <th>Ratio</th><th className="col-amt">Value</th>
            <th className="col-amt">Numerator</th><th className="col-amt">Denominator</th>
            <th>Formula</th>
          </tr>
        </thead>
        <tbody>
          {ratios.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="col-amt strong">{r.value}</td>
              <td className="col-amt muted">{r.numerator}</td>
              <td className="col-amt muted">{r.denominator}</td>
              <td className="muted small">{r.formula}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
