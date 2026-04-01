import type { Request, Response } from 'express';
import { db, generateUUID } from '../utils/db/index.js';
import {
  discoverAndSyncPrinters,
  getAllPrinters,
  getPrinterById,
  printToActivePrinter,
  printTestPage,
  isSystemAvailable,
} from '../services/ippPrintService.js';
import fs from 'fs';

interface JobRow {
  id: string;
  file_path: string | null;
  copies: number;
  color_mode: string;
  page_count: number;
  page_range_start: number | null;
  page_range_end: number | null;
}

/**
 * GET /api/printer/list — Discover system printers, sync to DB, return all.
 */
export const listPrinters = async (_req: Request, res: Response): Promise<void> => {
  try {
    await discoverAndSyncPrinters();
    const printers = getAllPrinters();
    const systemAvailable = await isSystemAvailable();

    res.json({
      printers: printers.map((p) => ({ ...p, is_active: !!p.is_active })),
      systemAvailable,
    });
  } catch (error) {
    console.error('[Printer] Failed to list printers:', error);
    res.status(500).json({ error: 'Failed to list printers' });
  }
};

/**
 * POST /api/printer — Add a manual (IPP) printer.
 */
export const addPrinter = (req: Request, res: Response): void => {
  try {
    const { name, ipp_url } = req.body;
    if (!name || !ipp_url) {
      res.status(400).json({ error: 'name and ipp_url are required' });
      return;
    }

    const id = generateUUID();
    db.prepare('INSERT INTO printers (id, name, ipp_url, source) VALUES (?, ?, ?, ?)').run(id, name.trim(), ipp_url.trim(), 'manual');
    const printer = getPrinterById(id);
    res.status(201).json({ printer: { ...printer, is_active: !!printer?.is_active } });
  } catch (error) {
    console.error('[Printer] Failed to add printer:', error);
    res.status(500).json({ error: 'Failed to add printer' });
  }
};

/**
 * DELETE /api/printer/:id — Remove a printer (manual only).
 */
export const removePrinter = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const printer = getPrinterById(id);
    if (!printer) { res.status(404).json({ error: 'Printer not found' }); return; }
    if (printer.source === 'system') { res.status(400).json({ error: 'System printers can only be removed from the operating system' }); return; }

    db.prepare('DELETE FROM printers WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Printer] Failed to remove printer:', error);
    res.status(500).json({ error: 'Failed to remove printer' });
  }
};

/**
 * PATCH /api/printer/:id/activate — Set as active printer (deactivate all others).
 */
export const activatePrinter = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const printer = getPrinterById(id);
    if (!printer) { res.status(404).json({ error: 'Printer not found' }); return; }

    db.prepare('UPDATE printers SET is_active = 0').run();
    db.prepare('UPDATE printers SET is_active = 1 WHERE id = ?').run(id);

    const updated = getPrinterById(id);
    if (req.io) {
      req.io.to('staff').emit('printer:activated', { printer: { ...updated, is_active: true } });
    }
    res.json({ printer: { ...updated, is_active: true } });
  } catch (error) {
    console.error('[Printer] Failed to activate printer:', error);
    res.status(500).json({ error: 'Failed to activate printer' });
  }
};

/**
 * POST /api/printer/:id/test — Print a test page to a specific printer.
 */
export const testPrint = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await printTestPage(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('[Printer] Test print failed:', error);
    res.status(500).json({ success: false, message: 'Test print failed' });
  }
};

/**
 * POST /api/printer/print/:jobId — Print a job to the active printer.
 * The file NEVER leaves the server. Staff client is a remote control only.
 */
export const printJob = async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;

    if (!job) { res.status(404).json({ success: false, message: 'Job not found' }); return; }
    if (!job.file_path || !fs.existsSync(job.file_path)) {
      res.status(404).json({ success: false, message: 'Print file no longer exists on server' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare("UPDATE jobs SET status = 'printing', updated_at = ? WHERE id = ?").run(now, jobId);

    if (req.io) {
      req.io.to('staff').emit('job:status-changed', { jobId, status: 'printing' });
      req.io.to('patron').emit('job:status-changed', { jobId, status: 'printing' });
    }

    const result = await printToActivePrinter(job.file_path, {
      copies: job.copies,
      colorMode: job.color_mode as 'bw' | 'color',
      duplex: !!(job as any).duplex,
      pageRangeStart: job.page_range_start,
      pageRangeEnd: job.page_range_end,
      pageCount: job.page_count,
    });

    // Mark as printed if successful, auto-complete if also paid
    if (result.success) {
      const paid = (db.prepare('SELECT paid FROM jobs WHERE id = ?').get(jobId) as any)?.paid || 0;
      const newStatus = paid ? 'completed' : 'printing';
      const completedAt = paid ? now : null;
      db.prepare('UPDATE jobs SET printed = 1, status = ?, completed_at = COALESCE(?, completed_at), updated_at = ? WHERE id = ?')
        .run(newStatus, completedAt, now, jobId);

      if (paid && req.io) {
        req.io.to('staff').emit('job:status-changed', { jobId, status: 'completed' });
        req.io.to('patron').emit('job:status-changed', { jobId, status: 'completed' });
      }
    }

    res.json(result);
  } catch (error) {
    console.error('[Printer] Print job failed:', error);
    res.status(500).json({ success: false, message: 'Print job failed' });
  }
};
