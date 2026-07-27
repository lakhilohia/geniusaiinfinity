import { Decimal } from 'decimal.js';
import { money, toRupee, ZERO } from '../shared/money';
import { GstBreakup, SupplyType } from '../shared/types';

export interface GstInput {
  taxableValue: string | number;
  gstRate: number; // total slab: 0|5|12|18|28
  cessRate?: number;
  supplierStateCode: string; // state of registration
  placeOfSupplyStateCode: string; // recipient place of supply
  isExport?: boolean;
  isExempt?: boolean;
  isNilRated?: boolean;
}

/**
 * Indian GST computation engine.
 *
 * Rule (Sec. 7/8 IGST Act & Sec. 9 CGST Act): if supplier state === place of
 * supply → intra-state → CGST + SGST (half the slab each); otherwise
 * inter-state → IGST (full slab). Exports/SEZ are zero-rated. Cess (where the
 * item attracts compensation cess) is charged over and above GST.
 *
 * Per Sec. 15 read with the CGST Rules, the tax amount is rounded to the
 * nearest rupee.
 */
export function computeGst(input: GstInput): GstBreakup {
  const taxable = money(input.taxableValue);
  const rate = input.gstRate;
  const cessRate = input.cessRate ?? 0;

  const supplyType = classifySupply(input);

  const zero: GstBreakup = {
    taxableValue: taxable.toFixed(2),
    cgst: '0.00', sgst: '0.00', igst: '0.00', cess: '0.00',
    rate, supplyType,
  };

  if (supplyType === SupplyType.Exempt
    || supplyType === SupplyType.NilRated
    || supplyType === SupplyType.Export) {
    return zero;
  }

  const cess = toRupee(taxable.times(cessRate).div(100));

  if (supplyType === SupplyType.Intra) {
    const half = toRupee(taxable.times(rate).div(200)); // rate/2 %
    return {
      ...zero,
      cgst: half.toFixed(2),
      sgst: half.toFixed(2),
      cess: cess.toFixed(2),
    };
  }

  // Inter-state → IGST = full slab.
  const igst = toRupee(taxable.times(rate).div(100));
  return { ...zero, igst: igst.toFixed(2), cess: cess.toFixed(2) };
}

export function classifySupply(input: GstInput): SupplyType {
  if (input.isExport) return SupplyType.Export;
  if (input.isExempt) return SupplyType.Exempt;
  if (input.isNilRated || input.gstRate === 0) return SupplyType.NilRated;
  return input.supplierStateCode === input.placeOfSupplyStateCode
    ? SupplyType.Intra
    : SupplyType.Inter;
}

/** Total invoice value = taxable + all taxes. */
export function invoiceTotal(taxable: Decimal, g: GstBreakup): Decimal {
  return taxable
    .plus(g.cgst).plus(g.sgst).plus(g.igst).plus(g.cess);
}

// ── E-Invoice / E-Way Bill JSON scaffolding (IRP schema-compatible) ────────
export interface EInvoiceItem {
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstRate: number;
  taxableValue: number;
}

/** Build the IRP-compatible e-invoice JSON envelope (schema v1.1 subset). */
export function buildEInvoiceJson(params: {
  supplierGstin: string; supplierStateCode: string;
  buyerGstin: string; buyerStateCode: string;
  docNo: string; docDate: string; // dd/mm/yyyy
  items: EInvoiceItem[];
  breakup: GstBreakup;
}) {
  const { items, breakup } = params;
  const totTaxable = items.reduce((s, i) => s + i.taxableValue, 0);
  return {
    Version: '1.1',
    TranDtls: { TaxSch: 'GST', SupTyp: 'B2B', RegRev: 'N' },
    DocDtls: { Typ: 'INV', No: params.docNo, Dt: params.docDate },
    SellerDtls: { Gstin: params.supplierGstin, Stcd: params.supplierStateCode },
    BuyerDtls: { Gstin: params.buyerGstin, Pos: params.buyerStateCode, Stcd: params.buyerStateCode },
    ItemList: items.map((it, idx) => ({
      SlNo: String(idx + 1),
      IsServc: /^99/.test(it.hsnCode) ? 'Y' : 'N',
      HsnCd: it.hsnCode,
      Qty: it.quantity,
      Unit: it.unit,
      UnitPrice: it.unitPrice,
      TotAmt: it.taxableValue,
      AssAmt: it.taxableValue,
      GstRt: it.gstRate,
      IgstAmt: Number(breakup.igst),
      CgstAmt: Number(breakup.cgst),
      SgstAmt: Number(breakup.sgst),
      CesAmt: Number(breakup.cess),
      TotItemVal: it.taxableValue,
    })),
    ValDtls: {
      AssVal: totTaxable,
      CgstVal: Number(breakup.cgst),
      SgstVal: Number(breakup.sgst),
      IgstVal: Number(breakup.igst),
      CesVal: Number(breakup.cess),
      TotInvVal: totTaxable + Number(breakup.cgst) + Number(breakup.sgst)
        + Number(breakup.igst) + Number(breakup.cess),
    },
  };
}

export interface EWayBillInput {
  supplierGstin: string; buyerGstin: string;
  fromStateCode: string; toStateCode: string;
  docNo: string; docDate: string;
  distanceKm: number; vehicleNo?: string; transportMode?: '1' | '2' | '3' | '4';
  totalValue: number;
}

/** E-Way Bill JSON structure (required when consignment > ₹50,000). */
export function buildEWayBillJson(i: EWayBillInput) {
  return {
    supplyType: 'O',
    subSupplyType: '1',
    docType: 'INV',
    docNo: i.docNo,
    docDate: i.docDate,
    fromGstin: i.supplierGstin,
    toGstin: i.buyerGstin,
    fromStateCode: i.fromStateCode,
    toStateCode: i.toStateCode,
    transDistance: String(i.distanceKm),
    transMode: i.transportMode ?? '1',
    vehicleNo: i.vehicleNo ?? '',
    totInvValue: i.totalValue,
  };
}
