import type { Database } from 'bun:sqlite';
import type { DbHelpers } from './helpers.js';
import { v4 as uuidv4 } from 'uuid';

interface SettingRow { value: string; }

export function runMigrations(db: Database, helpers: DbHelpers): void {
  // Migration 001: Remove ticket_sequence table (tickets are now derived from data)
  if (helpers.tableExists('ticket_sequence')) {
    db.exec('DROP TABLE ticket_sequence');
    console.log('[Migration] Dropped obsolete ticket_sequence table');
  }

  // Migration 002: Migrate old printer settings to printers table
  // Old settings: printer_mode, printer_ipp_url, printer_name → new printers table
  if (helpers.tableExists('printers')) {
    const oldMode = db.prepare("SELECT value FROM settings WHERE key = 'printer_mode'").get() as SettingRow | undefined;
    const oldIpp = db.prepare("SELECT value FROM settings WHERE key = 'printer_ipp_url'").get() as SettingRow | undefined;
    const oldName = db.prepare("SELECT value FROM settings WHERE key = 'printer_name'").get() as SettingRow | undefined;

    if (oldMode) {
      // Migrate network printer if one was configured
      if (oldMode.value === 'network' && oldIpp?.value) {
        const existing = db.prepare("SELECT id FROM printers WHERE ipp_url = ?").get(oldIpp.value);
        if (!existing) {
          db.prepare('INSERT INTO printers (id, name, ipp_url, is_active, source) VALUES (?, ?, ?, 1, ?)')
            .run(uuidv4(), oldName?.value || 'Network Printer', oldIpp.value, 'manual');
          console.log('[Migration] Migrated network printer to printers table');
        }
      }

      // Clean up old settings
      db.prepare("DELETE FROM settings WHERE key IN ('printer_mode', 'printer_ipp_url', 'printer_name')").run();
      console.log('[Migration] Removed old printer settings');
    }
  }

  // Migration 003: Add printed/paid columns to jobs
  if (!helpers.columnExists('jobs', 'printed')) {
    db.exec('ALTER TABLE jobs ADD COLUMN printed INTEGER NOT NULL DEFAULT 0');
    db.exec('ALTER TABLE jobs ADD COLUMN paid INTEGER NOT NULL DEFAULT 0');
    // Backfill: completed jobs were both printed and paid
    db.exec("UPDATE jobs SET printed = 1, paid = 1 WHERE status = 'completed'");
    db.exec("UPDATE jobs SET printed = 1 WHERE status = 'printing'");
    console.log('[Migration] Added printed/paid columns to jobs');
  }

  // Migration 004: Add duplex column to jobs
  if (!helpers.columnExists('jobs', 'duplex')) {
    db.exec('ALTER TABLE jobs ADD COLUMN duplex INTEGER NOT NULL DEFAULT 0');
    console.log('[Migration] Added duplex column to jobs');
  }
}
