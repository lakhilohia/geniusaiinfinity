import 'reflect-metadata';
import { DataSource } from 'typeorm';
import {
  Company, AccountGroup, Ledger, HsnSac, StockItem,
  Voucher, VoucherEntry, InventoryEntry,
} from './entities';

const ENTITIES = [
  Company, AccountGroup, Ledger, HsnSac, StockItem,
  Voucher, VoucherEntry, InventoryEntry,
];

let dataSource: DataSource | null = null;

/**
 * Initialise (or return) the SQLite-backed DataSource.
 *
 * Encryption: pass a `key` to open an AES-256 encrypted database. This uses
 * the SQLCipher-compatible `better-sqlite3-multiple-ciphers` driver when the
 * company is marked encrypted; the PRAGMA key is applied on connect. For a
 * plain (unencrypted) file, omit `key`.
 */
export async function initDataSource(dbPath: string, key?: string): Promise<DataSource> {
  if (dataSource?.isInitialized) return dataSource;

  dataSource = new DataSource({
    type: 'better-sqlite3',
    database: dbPath,
    entities: ENTITIES,
    synchronize: true, // dev: auto-DDL. In production, switch to migrations.
    // WAL mode gives durable, concurrent-read local storage for a desktop app.
    prepareDatabase: (db: any) => {
      if (key) {
        // SQLCipher PRAGMA — applied before any other statement.
        db.pragma(`cipher='sqlcipher'`);
        db.pragma(`legacy=4`);
        db.pragma(`key='${key.replace(/'/g, "''")}'`);
      }
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
    },
  });

  await dataSource.initialize();
  return dataSource;
}

export function getDataSource(): DataSource {
  if (!dataSource?.isInitialized) {
    throw new Error('DataSource not initialised — call initDataSource() first.');
  }
  return dataSource;
}

export async function closeDataSource(): Promise<void> {
  if (dataSource?.isInitialized) await dataSource.destroy();
  dataSource = null;
}
