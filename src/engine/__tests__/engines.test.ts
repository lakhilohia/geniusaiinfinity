import { describe, it, expect } from 'vitest';
import { PostingEngine, UnbalancedVoucherError } from '../posting-engine';
import { computeGst } from '../gst-engine';
import { computeTds } from '../tds-engine';
import { SupplyType } from '../../shared/types';

describe('PostingEngine.assertBalanced', () => {
  it('accepts a balanced double entry', () => {
    const total = PostingEngine.assertBalanced([
      { ledgerId: 'a', drCr: 'DR', amount: '1000.00' },
      { ledgerId: 'b', drCr: 'CR', amount: '1000.00' },
    ]);
    expect(total.toFixed(2)).toBe('1000.00');
  });

  it('accepts a multi-line split that nets to zero', () => {
    const total = PostingEngine.assertBalanced([
      { ledgerId: 'party', drCr: 'DR', amount: '1180.00' },
      { ledgerId: 'sales', drCr: 'CR', amount: '1000.00' },
      { ledgerId: 'cgst', drCr: 'CR', amount: '90.00' },
      { ledgerId: 'sgst', drCr: 'CR', amount: '90.00' },
    ]);
    expect(total.toFixed(2)).toBe('1180.00');
  });

  it('rejects an unbalanced voucher', () => {
    expect(() => PostingEngine.assertBalanced([
      { ledgerId: 'a', drCr: 'DR', amount: '100.00' },
      { ledgerId: 'b', drCr: 'CR', amount: '90.00' },
    ])).toThrow(UnbalancedVoucherError);
  });

  it('rejects a single-line voucher', () => {
    expect(() => PostingEngine.assertBalanced([
      { ledgerId: 'a', drCr: 'DR', amount: '100.00' },
    ])).toThrow(/at least two/);
  });
});

describe('GST engine', () => {
  it('splits intra-state 18% into CGST 9 + SGST 9', () => {
    const g = computeGst({
      taxableValue: '10000', gstRate: 18,
      supplierStateCode: '27', placeOfSupplyStateCode: '27',
    });
    expect(g.supplyType).toBe(SupplyType.Intra);
    expect(g.cgst).toBe('900.00');
    expect(g.sgst).toBe('900.00');
    expect(g.igst).toBe('0.00');
  });

  it('charges IGST on inter-state supply', () => {
    const g = computeGst({
      taxableValue: '10000', gstRate: 18,
      supplierStateCode: '27', placeOfSupplyStateCode: '29',
    });
    expect(g.supplyType).toBe(SupplyType.Inter);
    expect(g.igst).toBe('1800.00');
    expect(g.cgst).toBe('0.00');
  });

  it('treats exports as zero-rated', () => {
    const g = computeGst({
      taxableValue: '10000', gstRate: 18, isExport: true,
      supplierStateCode: '27', placeOfSupplyStateCode: '96',
    });
    expect(g.supplyType).toBe(SupplyType.Export);
    expect(g.igst).toBe('0.00');
  });
});

describe('TDS engine', () => {
  it('deducts 194J @10% above threshold', () => {
    const r = computeTds({ section: '194J', amount: '50000' });
    expect(r.applicable).toBe(true);
    expect(r.tdsAmount).toBe('5000.00');
  });

  it('does not deduct 194C below single-bill threshold', () => {
    const r = computeTds({ section: '194C', amount: '25000' });
    expect(r.applicable).toBe(false);
  });

  it('applies 206AA 20% when PAN is absent', () => {
    const r = computeTds({ section: '194J', amount: '50000', hasPan: false });
    expect(r.rate).toBe(20);
    expect(r.tdsAmount).toBe('10000.00');
  });

  it('194Q taxes only the amount above the 50L aggregate threshold', () => {
    const r = computeTds({ section: '194Q', amount: '1000000', aggregatePriorInFy: '4800000' });
    // aggregate 58L, excess over 50L = 8L → 0.1% = 800
    expect(r.applicable).toBe(true);
    expect(r.tdsAmount).toBe('800.00');
  });
});
