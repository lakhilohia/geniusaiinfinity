import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/** Inventory master. Closing stock valuation feeds "Changes in inventories"
 *  in the P&L and "Inventories" under Current Assets in the Balance Sheet. */
@Entity('stock_items')
@Index(['companyId', 'name'], { unique: true })
export class StockItem {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  companyId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  unit?: string; // Nos, Kg, Ltr...

  @Column({ type: 'uuid', nullable: true })
  hsnSacId?: string;

  @Column({ type: 'text', default: '0' })
  openingQty!: string;

  @Column({ type: 'text', default: '0.00' })
  openingValue!: string;

  // Valuation method for closing stock (AS-2 / Ind AS 2).
  @Column({ type: 'text', default: 'FIFO' })
  valuationMethod!: 'FIFO' | 'WEIGHTED_AVG' | 'LIFO' | 'STANDARD';

  @Column({ type: 'text', nullable: true })
  category?: string;
}
