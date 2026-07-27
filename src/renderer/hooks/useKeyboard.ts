import { useEffect } from 'react';
import { comboFromEvent, TALLY_KEYS } from '../../shared/keybindings';

/**
 * Global Tally-style keyboard dispatcher. Maps F-keys / Alt / Ctrl combos to
 * action strings and invokes the supplied handler. Ignores keystrokes while
 * typing in inputs unless the combo is a function/modifier shortcut (so power
 * users can still fire F8 from within a voucher form).
 */
export function useKeyboard(onAction: (action: string, combo: string) => void): void {
  useEffect(() => {
    const lookup = new Map(TALLY_KEYS.map((k) => [k.combo, k.action]));

    const handler = (e: KeyboardEvent) => {
      const combo = comboFromEvent(e);
      const action = lookup.get(combo);
      if (!action) return;

      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName,
      );
      const isModified = e.altKey || e.ctrlKey || e.metaKey || /^F\d+$/.test(e.key) || e.key === 'Escape';
      if (inField && !isModified) return;

      e.preventDefault();
      onAction(action, combo);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onAction]);
}
