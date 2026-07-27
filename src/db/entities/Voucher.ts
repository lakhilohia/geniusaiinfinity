import {
  Entity, PrimaryColumn, Column, OneToMany, Index, CreateDateColumn,
} from 'typeorm';
import { VoucherType, SupplyType } from '../../shared/types';
import { VoucherEntry } from './VoucherEntry';
import { InventoryEntry } from './InventoryEntry';

/**
 * A Voucher is the transactional header. Its VoucherEntry children are the
 * double-entry ledger postings and MUST net to zero (sum Dr = sum Cr) — the
 * posting engine enforces this before persisting.
 */
@Entity('vouchers')
@Index(['companyId', 'date'])
@Index(['companyId', 'type', 'voucherNumber'], { unique: true })
export class Voucher {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  companyId!: string;

  @Column({ type: 'text' })
  type!: VoucherType;

  @Column({ type: 'text' })
  voucherNumber!: string;

  @Column({ type: 'text' })
  date!: string; // ISO date

  @Column({ type: 'text', nullable: true })
  narration?: string;

  @Column({ type: 'text', nullable: true })
  reference?: string; // supplier invoice no. / cheque no.

  // ── GST context (set on Sales/Purchase/Notes) ─────────────────────────
  @Column({ type: 'text', nullable: true })
  partyLedgerId?: string; // buyer/supplier

  @Column({ type: 'text', nullable: true })
  placeOfSupplyStateCode?: string;

  @Column({ type: 'text', nullable: true })
  supplyType?: SupplyType;

  // E-Invoice / E-Way bill linkage (JSON structures generated on demand).
  @Column({ type: 'text', nullable: true })
  irn?: string; // Invoice Reference Number from IRP

  @Column({ type: 'text', nullable: true })
  ewayBillNo?: string;

  // SEBI LODR: flag & aggregate value tracked for RPT threshold reporting.
  @Column({ type: 'boolean', default: false })
  isRelatedPartyTxn!: boolean;

  @Column({ type: 'boolean', default: false })
  isCancelled!: boolean;

  @Column({ type: 'boolean', default: false })
  isOptional!: boolean; // Tally "optional" voucher — excluded from books

  // Denormalised total (abs value of Dr side) for fast list rendering.
  @Column({ type: 'text', default: '0.00' })
  amount!: string;

  @OneToMany(() => VoucherEntry, (e) => e.voucher, { cascade: true, eager: true })
  entries!: VoucherEntry[];

  @OneToMany(() => InventoryEntry, (e) => e.voucher, { cascade: true, eager: true })
  inventoryEntries!: InventoryEntry[];

  @CreateDateColumn()
  createdAt!: Date;
}
