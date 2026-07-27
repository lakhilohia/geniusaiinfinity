import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AccountGroup } from './AccountGroup';

/**
 * A Ledger is a postable account (Tally's "Ledger"). Every voucher line posts
 * to exactly one ledger. Opening balances and statutory attributes (GSTIN,
 * PAN for TDS, MSME status, related-party flag) live here.
 */
@Entity('ledgers')
@Index(['companyId', 'name'], { unique: true })
export class Ledger {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  companyId!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column('uuid')
  groupId!: string;

  @ManyToOne(() => AccountGroup, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'groupId' })
  group!: AccountGroup;

  // Opening balance: signed convention +Dr / -Cr, stored as fixed-2dp string.
  @Column({ type: 'text', default: '0.00' })
  openingBalance!: string;

  // ── Party / statutory attributes ──────────────────────────────────────
  @Column({ type: 'text', nullable: true })
  gstin?: string;

  @Column({ type: 'text', nullable: true })
  pan?: string; // required to apply correct (non-penal) TDS rate

  @Column({ type: 'text', nullable: true })
  stateCode?: string; // party place of supply

  @Column({ type: 'text', nullable: true })
  registrationType?: string; // Regular / Composition / Unregistered / SEZ

  // MSME (Micro/Small/Medium) segregation for Trade Payables ageing —
  // Schedule III mandates MSME vs non-MSME split + MSME Form-1 disclosure.
  @Column({ type: 'boolean', default: false })
  isMsme!: boolean;

  @Column({ type: 'text', nullable: true })
  msmeRegNo?: string;

  // SEBI LODR Clause 23 — related party tagging & threshold tracking.
  @Column({ type: 'boolean', default: false })
  isRelatedParty!: boolean;

  @Column({ type: 'text', nullable: true })
  relatedPartyRelation?: string; // e.g. "KMP", "Subsidiary", "Associate"

  // Default TDS/TCS section applicable to payments to/receipts from this party.
  @Column({ type: 'text', nullable: true })
  tdsSection?: string; // e.g. "194J", "194C", "194Q"

  @Column({ type: 'text', nullable: true })
  tcsSection?: string; // e.g. "206C(1H)"

  // Segment tag for AS-17 / Ind AS 108 segment reporting.
  @Column({ type: 'text', nullable: true })
  segment?: string;

  @Column({ type: 'boolean', default: false })
  isBankAccount!: boolean;

  @Column({ type: 'boolean', default: false })
  isRevenueLedger!: boolean; // "Revenue from Operations" for turnover ratios
}
