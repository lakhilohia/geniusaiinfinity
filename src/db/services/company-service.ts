import { v4 as uuid } from 'uuid';
import { DataSource } from 'typeorm';
import { Company, AccountGroup, Ledger } from '../entities';
import { DEFAULT_GROUPS } from '../seed/default-groups';
import { ScheduleIIIDivision } from '../../shared/types';

export interface CreateCompanyInput {
  name: string;
  state?: string;
  stateCode?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  fyStart: string;
  fyEnd: string;
  scheduleDivision?: ScheduleIIIDivision;
  isListedEntity?: boolean;
  numberOfShares?: number;
}

/** Create a company and seed its default Schedule III-mapped chart of accounts. */
export async function createCompany(ds: DataSource, input: CreateCompanyInput): Promise<Company> {
  return ds.transaction(async (m) => {
    const company = m.create(Company, {
      id: uuid(),
      name: input.name,
      state: input.state,
      stateCode: input.stateCode,
      gstin: input.gstin,
      pan: input.pan,
      cin: input.cin,
      fyStart: input.fyStart,
      fyEnd: input.fyEnd,
      booksStart: input.fyStart,
      scheduleDivision: input.scheduleDivision ?? ScheduleIIIDivision.DivisionI,
      isListedEntity: input.isListedEntity ?? false,
      numberOfShares: input.numberOfShares ?? 0,
    });
    await m.save(company);

    // Two-pass insert so parent references resolve by name.
    const byName = new Map<string, AccountGroup>();
    for (const g of DEFAULT_GROUPS) {
      const entity = m.create(AccountGroup, {
        id: uuid(),
        companyId: company.id,
        name: g.name,
        nature: g.nature,
        scheduleKey: g.scheduleKey ?? null,
        isPrimary: g.isPrimary ?? false,
        debitPositive: g.nature === 'ASSET' || g.nature === 'EXPENSE',
      });
      byName.set(g.name, entity);
    }
    for (const g of DEFAULT_GROUPS) {
      if (g.parent) byName.get(g.name)!.parentId = byName.get(g.parent)?.id ?? null;
    }
    await m.save([...byName.values()]);

    // A couple of always-needed system ledgers.
    const cashGroup = byName.get('Cash-in-Hand')!;
    const plGroup = byName.get('Reserves & Surplus')!;
    await m.save([
      m.create(Ledger, {
        id: uuid(), companyId: company.id, name: 'Cash', groupId: cashGroup.id, openingBalance: '0.00',
      }),
      m.create(Ledger, {
        id: uuid(), companyId: company.id, name: 'Profit & Loss A/c', groupId: plGroup.id, openingBalance: '0.00',
      }),
    ]);

    return company;
  });
}
