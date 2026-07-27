import type { IpcMain, Dialog } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { IPC } from './ipc-channels';
import { initDataSource, getDataSource } from '../src/db/data-source';
import { createCompany } from '../src/db/services/company-service';
import { PostingEngine } from '../src/engine/posting-engine';
import { computeLedgerBalances, trialBalanceTotals } from '../src/engine/trial-balance';
import { buildBalanceSheet } from '../src/reports/balance-sheet';
import { buildProfitLoss } from '../src/reports/profit-loss';
import { computeStatutoryRatios } from '../src/reports/ratios';
import { exportStatementsToPdf } from '../src/reports/exporters/pdf';
import { exportStatementsToXlsx } from '../src/reports/exporters/excel';
import { parseTallyXml, buildTallyVoucherXml } from '../src/tally/tally-xml';
import { computeGst } from '../src/engine/gst-engine';
import { computeTds } from '../src/engine/tds-engine';
import { Company, Ledger, Voucher } from '../src/db/entities';

/** Holds the currently-open company context for the session. */
let currentCompanyId: string | null = null;

export function registerIpcHandlers(ipcMain: IpcMain, dialog: Dialog, dataDir: string): void {
  const dbPathFor = (companyId: string) => path.join(dataDir, `${companyId}.sqlite`);

  const handle = (channel: string, fn: (payload: any) => Promise<unknown> | unknown) => {
    ipcMain.handle(channel, async (_e, payload) => {
      try {
        return { ok: true, data: await fn(payload) };
      } catch (err: any) {
        return { ok: false, error: err?.message ?? String(err) };
      }
    });
  };

  // ── Company lifecycle ──────────────────────────────────────────────────
  handle(IPC.companyList, () => {
    const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
    return files.filter((f) => f.endsWith('.sqlite')).map((f) => f.replace('.sqlite', ''));
  });

  handle(IPC.companyCreate, async (input) => {
    const id = input.id ?? cryptoRandomId();
    await initDataSource(dbPathFor(id), input.key);
    const company = await createCompany(getDataSource(), { ...input });
    // Rename DB file to the created company id if it differs.
    currentCompanyId = company.id;
    return company;
  });

  handle(IPC.companyOpen, async ({ id, key }) => {
    await initDataSource(dbPathFor(id), key);
    currentCompanyId = id;
    return getDataSource().getRepository(Company).findOneBy({ id });
  });

  // ── Masters ────────────────────────────────────────────────────────────
  handle(IPC.ledgerList, () =>
    getDataSource().getRepository(Ledger).find({ where: { companyId: requireCompany() } }));

  // ── Vouchers ─────────────────────────────────────────────────────────────
  handle(IPC.voucherPost, async (input) => {
    const engine = new PostingEngine(getDataSource());
    return engine.post({ ...input, companyId: requireCompany() });
  });

  handle(IPC.voucherList, async (filter) => {
    const qb = getDataSource().getRepository(Voucher)
      .createQueryBuilder('v')
      .where('v.companyId = :c', { c: requireCompany() })
      .orderBy('v.date', 'DESC').addOrderBy('v.voucherNumber', 'DESC')
      .take(filter?.limit ?? 200);
    if (filter?.type) qb.andWhere('v.type = :t', { t: filter.type });
    return qb.getMany();
  });

  handle(IPC.ledgerVouchers, async ({ ledgerId, toDate }) => {
    // Drill-down leaf: every voucher whose entries hit this ledger.
    return getDataSource().getRepository(Voucher)
      .createQueryBuilder('v')
      .innerJoin('v.entries', 'e', 'e.ledgerId = :ledgerId', { ledgerId })
      .where('v.companyId = :c AND v.isCancelled = 0 AND v.date <= :toDate',
        { c: requireCompany(), toDate })
      .orderBy('v.date', 'ASC')
      .getMany();
  });

  // ── Reports ──────────────────────────────────────────────────────────────
  handle(IPC.reportBalanceSheet, ({ companyId, toDate }) =>
    buildBalanceSheet(getDataSource(), companyId ?? requireCompany(), toDate));

  handle(IPC.reportProfitLoss, ({ companyId, fromDate, toDate }) =>
    buildProfitLoss(getDataSource(), companyId ?? requireCompany(), fromDate, toDate));

  handle(IPC.reportRatios, ({ companyId, fromDate, toDate }) =>
    computeStatutoryRatios(getDataSource(), companyId ?? requireCompany(), fromDate, toDate));

  handle(IPC.reportTrialBalance, async ({ toDate }) => {
    const balances = await computeLedgerBalances(getDataSource(), { companyId: requireCompany(), toDate });
    return { balances, totals: trialBalanceTotals(balances) };
  });

  // ── Tally interchange ────────────────────────────────────────────────────
  handle(IPC.tallyImport, (xml: string) => parseTallyXml(xml));

  handle(IPC.tallyExport, async () => {
    const vouchers = await getDataSource().getRepository(Voucher)
      .find({ where: { companyId: requireCompany() }, relations: { entries: true } });
    const ledgers = await getDataSource().getRepository(Ledger)
      .find({ where: { companyId: requireCompany() } });
    const ledgerName = new Map(ledgers.map((l) => [l.id, l.name]));
    const company = await getDataSource().getRepository(Company).findOneByOrFail({ id: requireCompany() });
    return buildTallyVoucherXml(company.name, vouchers.map((v) => ({
      type: v.type, date: v.date, voucherNumber: v.voucherNumber, narration: v.narration,
      lines: v.entries.map((e) => ({
        ledgerName: ledgerName.get(e.ledgerId) ?? e.ledgerId, drCr: e.drCr, amount: e.amount,
      })),
    })));
  });

  // ── File exports (write to disk via save dialog) ─────────────────────────
  handle(IPC.exportPdf, async ({ statements, ratios, suggestedName }) => {
    const buf = await exportStatementsToPdf(statements, ratios);
    return saveBuffer(dialog, buf, suggestedName ?? 'report.pdf', 'PDF');
  });

  handle(IPC.exportExcel, async ({ statements, ratios, suggestedName }) => {
    const buf = await exportStatementsToXlsx(statements, ratios);
    return saveBuffer(dialog, buf, suggestedName ?? 'report.xlsx', 'Excel');
  });

  // ── Stateless statutory calculators (used live during data entry) ────────
  handle(IPC.gstCompute, (input) => computeGst(input));
  handle(IPC.tdsCompute, (input) => computeTds(input));
}

function requireCompany(): string {
  if (!currentCompanyId) throw new Error('No company is open. Select a company first (F1).');
  return currentCompanyId;
}

async function saveBuffer(dialog: Dialog, buf: Buffer, name: string, kind: string) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: name,
    filters: [{ name: kind, extensions: [name.split('.').pop()!] }],
  });
  if (canceled || !filePath) return { saved: false };
  fs.writeFileSync(filePath, buf);
  return { saved: true, filePath };
}

function cryptoRandomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
