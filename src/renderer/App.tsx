import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BalanceSheet } from './components/BalanceSheet';
import { ProfitLoss } from './components/ProfitLoss';
import { RatiosPanel } from './components/RatiosPanel';
import { useKeyboard } from './hooks/useKeyboard';
import { TALLY_KEYS } from '../shared/keybindings';
import { api } from './api';

type View = 'balance-sheet' | 'profit-loss' | 'ratios' | 'gateway';

const NAV: { view: View; label: string; key: string }[] = [
  { view: 'gateway', label: 'Gateway', key: 'Esc' },
  { view: 'balance-sheet', label: 'Balance Sheet', key: 'F7' },
  { view: 'profit-loss', label: 'Profit & Loss', key: 'F8' },
  { view: 'ratios', label: 'Ratios', key: 'F9' },
];

export default function App() {
  const [companies, setCompanies] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [view, setView] = useState<View>('gateway');

  // Default period = current Indian FY (Apr–Mar).
  const { fyStart, fyEnd } = useMemo(() => currentFy(), []);
  const [fromDate] = useState(fyStart);
  const [toDate] = useState(fyEnd);

  useEffect(() => {
    api.listCompanies().then(async (ids) => {
      setCompanies(ids);
      if (ids.length && !companyId) {
        await api.openCompany(ids[0]);
        setCompanyId(ids[0]);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'nav.back': setView('gateway'); break;
      case 'voucher.journal': setView('balance-sheet'); break; // demo mapping
      case 'voucher.sales': setView('profit-loss'); break;
      case 'voucher.purchase': setView('ratios'); break;
      default: break;
    }
  }, []);
  useKeyboard(handleAction);

  const selectCompany = async (id: string) => {
    await api.openCompany(id);
    setCompanyId(id);
    setView('balance-sheet');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">∞</span>
          <div>
            <strong>GeniusAI Infinity</strong>
            <small>Offline Accounting · India</small>
          </div>
        </div>

        <nav>
          {NAV.map((n) => (
            <button
              key={n.view}
              className={view === n.view ? 'active' : ''}
              onClick={() => setView(n.view)}
              disabled={!companyId && n.view !== 'gateway'}
            >
              {n.label}<kbd>{n.key}</kbd>
            </button>
          ))}
        </nav>

        <div className="shortcut-legend">
          <h4>Shortcuts</h4>
          <ul>
            {TALLY_KEYS.slice(0, 10).map((k) => (
              <li key={k.combo}><kbd>{k.combo}</kbd> {k.description}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="content">
        {view === 'gateway' || !companyId ? (
          <Gateway companies={companies} onSelect={selectCompany} />
        ) : view === 'balance-sheet' ? (
          <BalanceSheet companyId={companyId} toDate={toDate} />
        ) : view === 'profit-loss' ? (
          <ProfitLoss companyId={companyId} fromDate={fromDate} toDate={toDate} />
        ) : (
          <RatiosPanel companyId={companyId} fromDate={fromDate} toDate={toDate} />
        )}
      </main>
    </div>
  );
}

function Gateway({ companies, onSelect }: { companies: string[]; onSelect: (id: string) => void }) {
  return (
    <div className="gateway">
      <h1>Gateway of GeniusAI Infinity</h1>
      <p className="muted">
        Offline-first, Tally-compatible accounting with built-in Companies Act 2013 (Schedule III),
        Income-tax, GST and SEBI LODR compliance.
      </p>
      <h3>Select a Company <kbd>F1</kbd></h3>
      {companies.length === 0 ? (
        <p className="muted">No companies yet. Create one (Alt+C) or import a Tally backup.</p>
      ) : (
        <ul className="company-list">
          {companies.map((id) => (
            <li key={id}><button onClick={() => onSelect(id)}>{id}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function currentFy(): { fyStart: string; fyEnd: string } {
  const now = new Date();
  const y = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { fyStart: `${y}-04-01`, fyEnd: `${y + 1}-03-31` };
}
