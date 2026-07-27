// Single source of truth for IPC channel names, shared by preload & handlers.
export const IPC = {
  companyOpen: 'company:open',
  companyCreate: 'company:create',
  companyList: 'company:list',
  ledgerList: 'ledger:list',
  voucherPost: 'voucher:post',
  voucherList: 'voucher:list',
  ledgerVouchers: 'ledger:vouchers', // drill-down: vouchers hitting a ledger
  reportBalanceSheet: 'report:balanceSheet',
  reportProfitLoss: 'report:profitLoss',
  reportRatios: 'report:ratios',
  reportTrialBalance: 'report:trialBalance',
  tallyImport: 'tally:import',
  tallyExport: 'tally:export',
  exportPdf: 'export:pdf',
  exportExcel: 'export:excel',
  gstCompute: 'gst:compute',
  tdsCompute: 'tds:compute',
} as const;

export type IpcChannel = (typeof IPC)[keyof typeof IPC];
