import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './ipc-channels';

/**
 * The renderer never touches Node, TypeORM or the filesystem directly. Every
 * capability is a typed, promise-returning method exposed on window.api. This
 * keeps the React bundle sandbox-safe while the Electron main process owns all
 * SQLite / statutory-engine logic.
 */
const api = {
  listCompanies: () => ipcRenderer.invoke(IPC.companyList),
  createCompany: (input: unknown) => ipcRenderer.invoke(IPC.companyCreate, input),
  openCompany: (id: string, key?: string) => ipcRenderer.invoke(IPC.companyOpen, { id, key }),

  listLedgers: () => ipcRenderer.invoke(IPC.ledgerList),
  postVoucher: (input: unknown) => ipcRenderer.invoke(IPC.voucherPost, input),
  listVouchers: (filter?: unknown) => ipcRenderer.invoke(IPC.voucherList, filter),
  ledgerVouchers: (ledgerId: string, toDate: string) =>
    ipcRenderer.invoke(IPC.ledgerVouchers, { ledgerId, toDate }),

  balanceSheet: (companyId: string, toDate: string) =>
    ipcRenderer.invoke(IPC.reportBalanceSheet, { companyId, toDate }),
  profitLoss: (companyId: string, fromDate: string, toDate: string) =>
    ipcRenderer.invoke(IPC.reportProfitLoss, { companyId, fromDate, toDate }),
  ratios: (companyId: string, fromDate: string, toDate: string) =>
    ipcRenderer.invoke(IPC.reportRatios, { companyId, fromDate, toDate }),
  trialBalance: (companyId: string, toDate: string) =>
    ipcRenderer.invoke(IPC.reportTrialBalance, { companyId, toDate }),

  importTally: (xml: string) => ipcRenderer.invoke(IPC.tallyImport, xml),
  exportTally: (companyId: string) => ipcRenderer.invoke(IPC.tallyExport, companyId),
  exportPdf: (payload: unknown) => ipcRenderer.invoke(IPC.exportPdf, payload),
  exportExcel: (payload: unknown) => ipcRenderer.invoke(IPC.exportExcel, payload),

  computeGst: (input: unknown) => ipcRenderer.invoke(IPC.gstCompute, input),
  computeTds: (input: unknown) => ipcRenderer.invoke(IPC.tdsCompute, input),
};

contextBridge.exposeInMainWorld('api', api);

export type ExposedApi = typeof api;
