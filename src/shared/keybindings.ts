// Legacy Tally keyboard map. Consumed by the renderer's useKeyboard hook so
// that power users never touch the mouse. Kept in shared/ so both the menu
// definitions (main) and handlers (renderer) reference one source of truth.

export interface KeyBinding {
  combo: string; // normalised: e.g. "F5", "Alt+G", "Ctrl+A"
  action: string;
  description: string;
}

export const TALLY_KEYS: KeyBinding[] = [
  { combo: 'F1', action: 'company.select', description: 'Select / open Company' },
  { combo: 'Alt+F1', action: 'company.shut', description: 'Shut (close) Company' },
  { combo: 'F2', action: 'period.change', description: 'Change current period' },
  { combo: 'Alt+F2', action: 'period.changeCompany', description: 'Change financial year' },
  { combo: 'F4', action: 'voucher.contra', description: 'Contra voucher' },
  { combo: 'F5', action: 'voucher.payment', description: 'Payment voucher' },
  { combo: 'F6', action: 'voucher.receipt', description: 'Receipt voucher' },
  { combo: 'F7', action: 'voucher.journal', description: 'Journal voucher' },
  { combo: 'F8', action: 'voucher.sales', description: 'Sales voucher' },
  { combo: 'F9', action: 'voucher.purchase', description: 'Purchase voucher' },
  { combo: 'Ctrl+F8', action: 'voucher.creditNote', description: 'Credit Note' },
  { combo: 'Ctrl+F9', action: 'voucher.debitNote', description: 'Debit Note' },
  { combo: 'Alt+G', action: 'nav.goto', description: 'Go To (quick navigate)' },
  { combo: 'Alt+C', action: 'master.create', description: 'Create master on the fly' },
  { combo: 'Ctrl+A', action: 'form.acceptAll', description: 'Accept / Save form' },
  { combo: 'Ctrl+Enter', action: 'form.accept', description: 'Accept current entry' },
  { combo: 'Alt+D', action: 'row.delete', description: 'Delete line / voucher' },
  { combo: 'Alt+X', action: 'voucher.cancel', description: 'Cancel voucher' },
  { combo: 'Escape', action: 'nav.back', description: 'Go back / cancel' },
  { combo: 'Alt+P', action: 'report.print', description: 'Print' },
  { combo: 'Alt+E', action: 'report.export', description: 'Export (PDF/Excel/XML)' },
  { combo: 'Ctrl+B', action: 'report.basis', description: 'Basis of values' },
  { combo: 'Enter', action: 'drill.into', description: 'Drill down into line' },
];

/** Normalise a KeyboardEvent into a combo string used by TALLY_KEYS. */
export function comboFromEvent(e: {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey && e.key.length > 1) parts.push('Shift');
  let key = e.key;
  if (key === ' ') key = 'Space';
  else if (key.length === 1) key = key.toUpperCase();
  parts.push(key);
  return parts.join('+');
}
