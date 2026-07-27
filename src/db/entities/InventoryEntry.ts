import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Voucher } from './Voucher';

/** Stock movement line attached to a Sales/Purchase/Stock-Journal voucher. */
@Entity('inventory_entries')
@Index(['stockItemId'])
export class InventoryEntry {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  voucherId!: string;

  @ManyToOne(() => Voucher, (v) => v.inventoryEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voucherId' })
  voucher!: Voucher;

  @Column('uuid')
  stockItemId!: string;

  @Column({ type: 'text' })
  quantity!: string; // +inward / -outward

  @Column({ type: 'text' })
  rate!: string;

  @Column({ type: 'text' })
  amount!: string;

  @Column({ type: 'text', nullable: true })
  hsnCode?: string;

  @Column({ type: 'real', nullable: true })
  gstRate?: number;
}
