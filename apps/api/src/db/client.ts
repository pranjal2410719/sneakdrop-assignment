// @ts-ignore
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL } from './schema.js';
import path from 'path';
import fs from 'fs';

export interface DBConfig {
  dbPath?: string;
  inMemory?: boolean;
}

export class DBWrapper {
  private db: any;
  private inTx: boolean = false;

  constructor(targetPath: string) {
    this.db = new DatabaseSync(targetPath);
    this.init();
  }

  private init() {
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA_SQL);
  }

  public prepare(sql: string) {
    return this.db.prepare(sql);
  }

  public exec(sql: string) {
    return this.db.exec(sql);
  }

  public close() {
    this.db.close();
  }

  public transaction<T>(fn: () => T): T {
    if (this.inTx) {
      return fn();
    }
    this.inTx = true;
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const result = fn();
      this.db.exec('COMMIT;');
      return result;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    } finally {
      this.inTx = false;
    }
  }
}

let dbInstance: DBWrapper | null = null;

export function getDatabase(config: DBConfig = {}): DBWrapper {
  if (config.inMemory) {
    return new DBWrapper(':memory:');
  }

  if (config.dbPath) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    return new DBWrapper(config.dbPath);
  }

  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = process.env.DATABASE_URL || path.resolve(process.cwd(), 'sneakdrop.db');
  const dbDir = path.dirname(targetPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new DBWrapper(targetPath);
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
