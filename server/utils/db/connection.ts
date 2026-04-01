import { Database } from 'bun:sqlite';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createDbHelpers } from './helpers.js';
import { runSchema } from './schema.js';
import { runMigrations } from './migrations.js';

// Use DATABASE_PATH env var if set, otherwise default relative path
let dbPath: string;
if (process.env.DATABASE_PATH) {
  dbPath = process.env.DATABASE_PATH;
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  console.log('[DB] Using DATABASE_PATH:', dbPath);
} else {
  const dataDir = path.join(import.meta.dir, '../../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  dbPath = path.join(dataDir, 'print-kiosk.db');
  console.log('[DB] Using default path:', dbPath);
}

const db = new Database(dbPath);

// Configure SQLite for optimal performance
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');
db.exec('PRAGMA synchronous = NORMAL');
db.exec('PRAGMA cache_size = -64000'); // 64MB
db.exec('PRAGMA temp_store = MEMORY');

console.log('[DB] Database configured with WAL mode');

// Periodic WAL checkpoint (every 5 minutes)
setInterval(() => {
  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE)');
  } catch (error) {
    console.error('[DB] WAL checkpoint error:', error);
  }
}, 5 * 60 * 1000);

const initDB = (): void => {
  const helpers = createDbHelpers(db);

  runSchema(db);

  try {
    runMigrations(db, helpers);
    console.log('[DB] Database initialized successfully');
  } catch (error) {
    console.error('[DB Migration] Migration failed:', error);
    throw error;
  }
};

const transaction = <T>(fn: () => T): (() => T) => {
  return db.transaction(fn);
};

const generateUUID = (): string => uuidv4();

export { db, initDB, transaction, generateUUID };
export type { Database } from 'bun:sqlite';
