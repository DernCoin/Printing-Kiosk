import type { Database } from 'bun:sqlite';

export function runSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      ticket_number INTEGER NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'waiting',
      color_mode TEXT NOT NULL DEFAULT 'bw',
      duplex INTEGER NOT NULL DEFAULT 0,
      copies INTEGER NOT NULL DEFAULT 1,
      page_range_start INTEGER,
      page_range_end INTEGER,
      page_count INTEGER NOT NULL DEFAULT 0,
      estimated_cost INTEGER NOT NULL DEFAULT 0,
      file_path TEXT,
      original_filename TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      mime_type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'usb',
      reject_reason TEXT,
      printed INTEGER NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES
      ('pricing_bw_per_page', '10'),
      ('pricing_color_per_page', '25'),
      ('job_timeout_minutes', '30'),
      ('staff_pin', ''),
      ('kiosk_pin', ''),
      ('ticket_reset_daily', 'true'),
      ('server_address', '');

    CREATE TABLE IF NOT EXISTS printers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system_name TEXT,
      ipp_url TEXT,
      is_active INTEGER DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'system',
      added_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_history (
      id TEXT PRIMARY KEY,
      ticket_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      page_count INTEGER NOT NULL DEFAULT 0,
      estimated_cost INTEGER NOT NULL DEFAULT 0,
      color_mode TEXT NOT NULL DEFAULT 'bw',
      copies INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'usb',
      original_filename TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at);
    CREATE INDEX IF NOT EXISTS idx_history_created ON job_history(created_at);
  `);
}
