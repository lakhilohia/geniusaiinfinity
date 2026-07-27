import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AccountNature } from '../../shared/types';

/**
 * Multi-level account group tree (mirrors Tally's Groups). Each group is
 * mapped to a Schedule III sub-head so that the Balance Sheet / P&L can be
 * assembled purely by walking group ancestry — no hard-coded ledger lists.
 *
 * `scheduleKey` is the machine key into SCHEDULE_III_MAP (see engine/schedule3.ts)
 * e.g. "BS.EL.SHF.RES" (Reserves & Surplus) or "PL.EXP.EMP" (Employee benefits).
 */
@Entity('account_groups')
@Index(['companyId', 'name'], { unique: true })
export class AccountGroup {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  companyId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => AccountGroup, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'parentId' })
  parent?: AccountGroup | null;

  @Column({ type: 'text' })
  nature!: AccountNature;

  /** Schedule III sub-head key. Inherited from parent when null. */
  @Column({ type: 'text', nullable: true })
  scheduleKey?: string | null;

  /** True for the 28 reserved primary groups (cannot be deleted). */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  /** Whether debit balances on member ledgers are "positive". Derived from
   *  nature but stored for fast trial-balance sign handling. */
  @Column({ type: 'boolean', default: true })
  debitPositive!: boolean;

  @Column({ type: 'integer', default: 0 })
  sortOrder!: number;
}
