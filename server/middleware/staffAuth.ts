import type { Request, Response, NextFunction } from 'express';
import { db } from '../utils/db/index.js';

interface SettingRow {
  value: string;
}

/**
 * Middleware to protect staff-only routes.
 * Checks x-staff-pin header against stored PIN.
 * If no PIN is set yet (first run), allows access.
 */
const staffAuth = (req: Request, res: Response, next: NextFunction): void => {
  const storedPin = db.prepare("SELECT value FROM settings WHERE key = 'staff_pin'").get() as SettingRow | undefined;

  // If no PIN set, allow access (setup wizard hasn't run yet)
  if (!storedPin || !storedPin.value) {
    next();
    return;
  }

  const providedPin = req.headers['x-staff-pin'] as string | undefined;

  if (!providedPin) {
    res.status(401).json({ error: 'Staff PIN required' });
    return;
  }

  if (providedPin !== storedPin.value) {
    res.status(403).json({ error: 'Invalid staff PIN' });
    return;
  }

  next();
};

export default staffAuth;
