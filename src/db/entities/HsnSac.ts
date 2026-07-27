import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

/** HSN (goods) / SAC (services) master with the applicable GST slab. */
@Entity('hsn_sac')
@Index(['companyId', 'code'], { unique: true })
export class HsnSac {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  companyId!: string;

  @Column({ type: 'text' })
  code!: string; // 4/6/8-digit HSN or 6-digit SAC

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'boolean', default: false })
  isService!: boolean;

  // Total GST rate; CGST/SGST are half each on intra-state, IGST is the full
  // rate on inter-state supply.
  @Column({ type: 'real', default: 0 })
  gstRate!: number; // 0 | 5 | 12 | 18 | 28

  @Column({ type: 'real', default: 0 })
  cessRate!: number;
}
