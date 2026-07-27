import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { DrCr } from '../../shared/types';
import { Voucher } from './Voucher';

/**
 * One ledger posting line. `amount` is always POSITIVE; direction is carried
 * by `drCr`. The signed contribution to a ledger's running balance is
 * (drCr === 'DR' ? +amount : -amount). Sum of signed amounts across a
 * voucher's entries must equal zero.
 */
@Entity('voucher_entries')
@Index(['ledgerId'])
export class VoucherEntry {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  voucherId!: string;

  @ManyToOne(() => Voucher, (v) => v.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucherId' })
  voucher!: Voucher;

  @Column('uuid')
  ledgerId!: string;

  @Column({ type: 'text' })
  drCr!: DrCr;

  @Column({ type: 'text' })
  amount!: string; // positive, fixed 2dp

  @Column({ type: 'integer', default: 0 })
  lineOrder!: number;

  // ── Tax / statutory context on this line ──────────────────────────────
  @Column({ type: 'text', nullable: true })
  taxType?: 'CGST' | 'SGST' | 'IGST' | 'CESS' | 'TDS' | 'TCS' | null;

  @Column({ type: 'real', nullable: true })
  taxRate?: number;

  @Column({ type: 'text', nullable: true })
  tdsSection?: string;

  @Column({ type: 'text', nullable: true })
  costCentre?: string;

  @Column({ type: 'text', nullable: true })
  billReference?: string; // bill-wise (New Ref / Agst Ref) for ageing
}
