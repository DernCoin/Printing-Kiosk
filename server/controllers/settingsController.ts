import type { Request, Response } from 'express';
import { db } from '../utils/db/index.js';

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

/**
 * GET /api/settings — Get all settings.
 */
export const getSettings = (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM settings').all() as SettingRow[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  } catch (error) {
    console.error('[Settings] Failed to get settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
};

/**
 * GET /api/settings/:key — Get a single setting.
 */
export const getSetting = (req: Request, res: Response): void => {
  try {
    const { key } = req.params;
    const row = db.prepare('SELECT * FROM settings WHERE key = ?').get(key) as SettingRow | undefined;

    if (!row) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    res.json({ key: row.key, value: row.value });
  } catch (error) {
    console.error('[Settings] Failed to get setting:', error);
    res.status(500).json({ error: 'Failed to get setting' });
  }
};

/**
 * PUT /api/settings/:key — Update a setting (staff only).
 */
export const updateSetting = (req: Request, res: Response): void => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      res.status(400).json({ error: 'Value is required' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, String(value), now);

    // Broadcast setting change
    if (req.io) {
      req.io.to('staff').emit('settings:updated', { key, value: String(value) });
      req.io.to('patron').emit('settings:updated', { key, value: String(value) });
    }

    res.json({ key, value: String(value) });
  } catch (error) {
    console.error('[Settings] Failed to update setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

/**
 * PUT /api/settings — Bulk update settings (staff only, used by setup wizard).
 */
export const updateSettings = (req: Request, res: Response): void => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object is required' });
      return;
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
    );

    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value), now);
    }

    // Broadcast
    if (req.io) {
      for (const [key, value] of Object.entries(settings)) {
        req.io.to('staff').emit('settings:updated', { key, value: String(value) });
        req.io.to('patron').emit('settings:updated', { key, value: String(value) });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Settings] Failed to bulk update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
