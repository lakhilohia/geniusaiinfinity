import { v4 as uuid } from 'uuid';
import { DataSource, QueryRunner } from 'typeorm';
import { Decimal } from 'decimal.js';
import { DrCr, VoucherType } from '../shared/types';
import { money, store, ZERO, toPaise } from '../shared/money';
import { Voucher } from '../db/entities/Voucher';
import { VoucherEntry } from '../db/entities/VoucherEntry';
import { InventoryEntry } from '../db/entities/InventoryEntry';
import { Ledger } from '../db/entities/Ledger';

export interface PostingLine {
  ledgerId: string;
  drCr: DrCr;
  amount: string | number;
  taxType?: VoucherEntry['taxType'];
  taxRate?: number;
  tdsSection?: string;
  costCentre?: string;
  billReference?: string;
}

export interface InventoryLine {
  stockItemId: string;
  quantity: string | number;
  rate: string | number;
  amount: string | number;
  hsnCode?: string;
  gstRate?: number;
}

export interface PostVoucherInput {
  companyId: string;
  type: VoucherType;
  date: string;
  voucherNumber?: string; // auto-generated if omitted
  narration?: string;
  reference?: string;
  partyLedgerId?: string;
  placeOfSupplyStateCode?: string;
  isRelatedPartyTxn?: boolean;
  isOptional?: boolean;
  lines: PostingLine[];
  inventory?: InventoryLine[];
}

export class UnbalancedVoucherError extends Error {
  constructor(public debit: string, public credit: string) {
    super(`Voucher does not balance: Dr ${debit} ≠ Cr ${credit}`);
    this.name = 'UnbalancedVoucherError';
  }
}

/**
 * The double-entry posting engine.
 *
 * Guarantees, enforced atomically inside a single transaction:
 *  1. Σ(Dr) === Σ(Cr)  — the fundamental accounting equation stays intact.
 *  2. At least two lines, each with a positive amount and a valid ledger.
 *  3. Voucher numbers are unique per (company, type) — auto-incremented.
 *  4. Cancel is a soft, reversible flag; delete cascades entries.
 */
export class PostingEngine {
  constructor(private ds: DataSource) {}

  /** Validate that the posting lines net to zero. Returns the balanced total. */
  static assertBalanced(lines: PostingLine[]): Decimal {
    if (lines.length < 2) {
      throw new Error('A voucher requires at least two ledger lines (double entry).');
    }
    let dr = ZERO;
    let cr = ZERO;
    for (const l of lines) {
      const amt = money(l.amount);
      if (amt.lessThanOrEqualTo(0)) {
        throw new Error(`Line amount must be positive (got ${amt.toString()}).`);
      }
      if (l.drCr === 'DR') dr = dr.plus(amt);
      else cr = cr.plus(amt);
    }
    const drR = toPaise(dr);
    const crR = toPaise(cr);
    if (!drR.equals(crR)) {
      throw new UnbalancedVoucherError(drR.toFixed(2), crR.toFixed(2));
    }
    return drR;
  }

  private async nextVoucherNumber(
    qr: QueryRunner, companyId: string, type: VoucherType,
  ): Promise<string> {
    const row = await qr.manager
      .createQueryBuilder(Voucher, 'v')
      .select('COUNT(*)', 'cnt')
      .where('v.companyId = :companyId AND v.type = :type', { companyId, type })
      .getRawOne<{ cnt: number }>();
    const seq = (Number(row?.cnt ?? 0)) + 1;
    const prefix = VOUCHER_PREFIX[type];
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async post(input: PostVoucherInput): Promise<Voucher> {
    const total = PostingEngine.assertBalanced(input.lines);

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      // Referential check: every ledger must exist & belong to the company.
      const ledgerIds = [...new Set(input.lines.map((l) => l.ledgerId))];
      const found = await qr.manager.count(Ledger, {
        where: ledgerIds.map((id) => ({ id, companyId: input.companyId })),
      });
      if (found !== ledgerIds.length) {
        throw new Error('One or more ledgers do not exist in this company.');
      }

      const voucherNumber = input.voucherNumber
        ?? (await this.nextVoucherNumber(qr, input.companyId, input.type));

      const voucher = qr.manager.create(Voucher, {
        id: uuid(),
        companyId: input.companyId,
        type: input.type,
        voucherNumber,
        date: input.date,
        narration: input.narration,
        reference: input.reference,
        partyLedgerId: input.partyLedgerId,
        placeOfSupplyStateCode: input.placeOfSupplyStateCode,
        isRelatedPartyTxn: input.isRelatedPartyTxn ?? false,
        isOptional: input.isOptional ?? false,
        isCancelled: false,
        amount: store(total),
        entries: input.lines.map((l, i) => qr.manager.create(VoucherEntry, {
          id: uuid(),
          ledgerId: l.ledgerId,
          drCr: l.drCr,
          amount: store(money(l.amount)),
          lineOrder: i,
          taxType: l.taxType ?? null,
          taxRate: l.taxRate,
          tdsSection: l.tdsSection,
          costCentre: l.costCentre,
          billReference: l.billReference,
        })),
        inventoryEntries: (input.inventory ?? []).map((iv) => qr.manager.create(InventoryEntry, {
          id: uuid(),
          stockItemId: iv.stockItemId,
          quantity: money(iv.quantity).toString(),
          rate: store(money(iv.rate)),
          amount: store(money(iv.amount)),
          hsnCode: iv.hsnCode,
          gstRate: iv.gstRate,
        })),
      });

      const saved = await qr.manager.save(Voucher, voucher);
      await qr.commitTransaction();
      return saved;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  /** Soft-cancel: keeps the number in the series (Tally behaviour) but zeroes
   *  its effect on balances. */
  async cancel(voucherId: string): Promise<void> {
    await this.ds.getRepository(Voucher).update({ id: voucherId }, { isCancelled: true });
  }

  async delete(voucherId: string): Promise<void> {
    await this.ds.getRepository(Voucher).delete({ id: voucherId });
  }
}

const VOUCHER_PREFIX: Record<VoucherType, string> = {
  [VoucherType.Sales]: 'S',
  [VoucherType.Purchase]: 'P',
  [VoucherType.Payment]: 'PY',
  [VoucherType.Receipt]: 'RC',
  [VoucherType.Contra]: 'CN',
  [VoucherType.Journal]: 'JV',
  [VoucherType.DebitNote]: 'DN',
  [VoucherType.CreditNote]: 'CR',
  [VoucherType.StockJournal]: 'SJ',
};
