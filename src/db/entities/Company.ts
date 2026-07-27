import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ScheduleIIIDivision } from '../../shared/types';

@Entity('companies')
export class Company {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  mailingName?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'text', nullable: true })
  state?: string; // State of registration — drives intra/inter-state GST

  @Column({ type: 'text', nullable: true })
  stateCode?: string; // GST state code, e.g. "27" for Maharashtra

  @Column({ type: 'text', nullable: true })
  pincode?: string;

  @Column({ type: 'text', nullable: true })
  gstin?: string;

  @Column({ type: 'text', nullable: true })
  pan?: string;

  @Column({ type: 'text', nullable: true })
  cin?: string; // Corporate Identity Number

  @Column({ type: 'text', nullable: true })
  tan?: string; // TDS deduction account number

  // Financial year for the open period
  @Column({ type: 'text' })
  fyStart!: string; // ISO date, e.g. 2025-04-01

  @Column({ type: 'text' })
  fyEnd!: string; // ISO date, e.g. 2026-03-31

  @Column({ type: 'text' })
  booksStart!: string;

  @Column({ type: 'text', default: ScheduleIIIDivision.DivisionI })
  scheduleDivision!: ScheduleIIIDivision;

  @Column({ type: 'boolean', default: false })
  isListedEntity!: boolean; // triggers SEBI LODR RPT / segment disclosures

  @Column({ type: 'boolean', default: true })
  gstEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  tdsEnabled!: boolean;

  // AES-256 encryption of the SQLite file is handled at the DB layer; this
  // flag records the user's choice so the loader knows to expect a key.
  @Column({ type: 'boolean', default: false })
  encrypted!: boolean;

  @Column({ type: 'integer', default: 0 })
  numberOfShares!: number; // for EPS computation

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
