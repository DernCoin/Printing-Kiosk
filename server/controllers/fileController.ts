import type { Request, Response } from 'express';
import fs from 'fs';
import { generateUUID, db } from '../utils/db/index.js';
import { convertToPdf, needsConversion } from '../services/conversionService.js';
import { getPageCount, generateThumbnails, getThumbnailPath } from '../services/pdfService.js';
import { calculateJobCost } from '../services/pricingService.js';
import { getTempDir } from '../utils/tempDir.js';

interface SettingRow { value: string; }

/**
 * Get the next ticket number. Derived from data — no separate counter.
 *
 * If daily reset is enabled: ticket = max(today's tickets across jobs + job_history) + 1
 * If daily reset is disabled: ticket = max(all tickets across jobs + job_history) + 1
 *
 * This is crash-safe, restart-safe, and idempotent. There is no external
 * sequence to desync. The ticket number is always 1 + the highest existing
 * ticket in the relevant scope.
 */
function getNextTicketNumber(): number {
  const resetDaily = (db.prepare(
    "SELECT value FROM settings WHERE key = 'ticket_reset_daily'"
  ).get() as SettingRow | undefined)?.value === 'true';

  if (resetDaily) {
    // Only look at today's date (UTC) across both tables
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const row = db.prepare(`
      SELECT MAX(ticket_number) AS mx FROM (
        SELECT ticket_number FROM jobs WHERE created_at >= ?
        UNION ALL
        SELECT ticket_number FROM job_history WHERE created_at >= ?
      )
    `).get(`${today}T00:00:00`, `${today}T00:00:00`) as { mx: number | null } | undefined;
    return (row?.mx ?? 0) + 1;
  } else {
    // Global max across both tables
    const row = db.prepare(`
      SELECT MAX(ticket_number) AS mx FROM (
        SELECT ticket_number FROM jobs
        UNION ALL
        SELECT ticket_number FROM job_history
      )
    `).get() as { mx: number | null } | undefined;
    return (row?.mx ?? 0) + 1;
  }
}

/**
 * POST /api/files/upload — Upload a file for printing.
 * Handles conversion to PDF if needed, counts pages, creates job.
 */
export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log('[Upload] Received:', file.originalname, file.mimetype, file.size, 'bytes');

    const tempDir = getTempDir();
    let pdfPath = file.path;

    // Convert to PDF if needed
    if (needsConversion(file.mimetype)) {
      console.log('[Upload] Converting to PDF...');
      pdfPath = await convertToPdf(file.path, tempDir);
    }

    // Get page count
    const pageCount = await getPageCount(pdfPath);
    console.log('[Upload] Page count:', pageCount);

    // Calculate initial cost (B&W, 1 copy, all pages)
    const estimatedCost = calculateJobCost(pageCount, 1, 'bw', null, null);

    // Assign ticket number — derived from data, never desyncs
    const ticketNumber = getNextTicketNumber();

    // Create job record
    const jobId = generateUUID();
    const now = new Date().toISOString();
    const source = (req.headers['x-client-type'] === 'phone' || req.body.source === 'phone') ? 'phone' : 'usb';

    db.prepare(`
      INSERT INTO jobs (id, ticket_number, status, color_mode, copies, page_count, estimated_cost, file_path, original_filename, file_size, mime_type, source, created_at, updated_at)
      VALUES (?, ?, 'waiting', 'bw', 1, ?, ?, ?, ?, ?, 'application/pdf', ?, ?, ?)
    `).run(
      jobId, ticketNumber, pageCount, estimatedCost,
      pdfPath, file.originalname, file.size,
      source, now, now,
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    // Broadcast to staff
    if (req.io) {
      req.io.to('staff').emit('job:submitted', { job });
    }

    // If phone upload, also notify the kiosk
    const sessionId = req.body.sessionId || req.headers['x-session-id'];
    if (sessionId && req.io) {
      req.io.to('patron').emit('upload:received', { sessionId, job });
    }

    // Build thumbnail URLs
    const thumbnailUrls: string[] = [];
    for (let i = 0; i < Math.min(pageCount, 20); i++) {
      thumbnailUrls.push(`/api/files/${jobId}/thumbnail/${i}`);
    }

    res.status(201).json({
      job,
      ticketNumber,
      thumbnailUrls,
    });

    // Generate thumbnails after responding (fire-and-forget)
    generateThumbnails(pdfPath, jobId, tempDir, 20).catch((err) => {
      console.error('[Upload] Thumbnail generation failed:', err);
    });
  } catch (error) {
    console.error('[Upload] Failed:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
};

/**
 * GET /api/files/:jobId/download — Download the PDF for a job.
 * Staff only — used for local printing mode.
 */
export const downloadFile = (req: Request, res: Response): void => {
  try {
    const { jobId } = req.params;
    const job = db.prepare('SELECT file_path, original_filename FROM jobs WHERE id = ?').get(jobId) as { file_path: string | null; original_filename: string } | undefined;

    if (!job || !job.file_path) {
      res.status(404).json({ error: 'File not found or already deleted' });
      return;
    }

    if (!fs.existsSync(job.file_path)) {
      res.status(404).json({ error: 'File no longer exists on disk' });
      return;
    }

    const downloadName = job.original_filename.replace(/\.[^.]+$/, '.pdf');
    res.download(job.file_path, downloadName);
  } catch (error) {
    console.error('[Download] Failed:', error);
    res.status(500).json({ error: 'Download failed' });
  }
};

/**
 * GET /api/files/:jobId/thumbnail/:page — Get a page thumbnail PNG.
 */
export const getThumbnail = (req: Request, res: Response): void => {
  try {
    const { jobId, page } = req.params;
    const tempDir = getTempDir();
    const thumbPath = getThumbnailPath(tempDir, jobId, parseInt(page, 10));

    if (thumbPath) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.sendFile(thumbPath);
      return;
    }

    res.status(404).json({ error: 'Thumbnail not available yet' });
  } catch (error) {
    console.error('[Thumbnail] Failed:', error);
    res.status(500).json({ error: 'Thumbnail failed' });
  }
};
