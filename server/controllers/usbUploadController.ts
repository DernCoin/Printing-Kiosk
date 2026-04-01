import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { generateUUID, db } from '../utils/db/index.js';
import { convertToPdf, needsConversion } from '../services/conversionService.js';
import { getPageCount, generateThumbnails } from '../services/pdfService.js';
import { calculateJobCost } from '../services/pricingService.js';
import { detectUsbDrives } from '../services/usbService.js';
import { getTempDir } from '../utils/tempDir.js';

interface SettingRow { value: string; }

function getNextTicketNumber(): number {
  const resetDaily = (db.prepare(
    "SELECT value FROM settings WHERE key = 'ticket_reset_daily'"
  ).get() as SettingRow | undefined)?.value === 'true';

  if (resetDaily) {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT MAX(ticket_number) AS mx FROM (
        SELECT ticket_number FROM jobs WHERE created_at >= ?
        UNION ALL
        SELECT ticket_number FROM job_history WHERE created_at >= ?
      )
    `).get(`${today}T00:00:00`, `${today}T00:00:00`) as { mx: number | null } | undefined;
    return (row?.mx ?? 0) + 1;
  } else {
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
 * POST /api/files/upload-from-usb — Copy a file from a USB drive path on the server.
 * Body: { filePath: string, drivePath: string }
 *
 * Security: validates that filePath is within a recognized USB drive mount.
 * The file is COPIED to temp (not moved), so the patron's USB is untouched.
 */
export const uploadFromUsb = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, drivePath } = req.body;

    if (!filePath || !drivePath) {
      res.status(400).json({ error: 'filePath and drivePath are required' });
      return;
    }

    // Security: verify the drive is a real USB mount
    const drives = detectUsbDrives();
    const matchedDrive = drives.find((d) => d.mountPath === drivePath);
    if (!matchedDrive) {
      res.status(403).json({ error: 'Not a recognized USB drive' });
      return;
    }

    // Security: verify filePath is within the drive
    const resolvedFile = path.resolve(filePath);
    const resolvedDrive = path.resolve(drivePath);
    if (!resolvedFile.startsWith(resolvedDrive)) {
      res.status(403).json({ error: 'File path is outside the USB drive' });
      return;
    }

    if (!fs.existsSync(resolvedFile)) {
      res.status(404).json({ error: 'File not found on USB drive' });
      return;
    }

    const originalFilename = path.basename(resolvedFile);
    const ext = path.extname(originalFilename).toLowerCase();
    const stat = fs.statSync(resolvedFile);
    const tempDir = getTempDir();

    // Copy file to temp with UUID name
    const tempName = `${uuidv4()}${ext}`;
    const tempPath = path.join(tempDir, tempName);
    fs.copyFileSync(resolvedFile, tempPath);

    console.log('[USB Upload] Copied:', originalFilename, stat.size, 'bytes');

    // Convert to PDF if needed
    let pdfPath = tempPath;
    const mimeType = getMimeType(ext);

    if (needsConversion(mimeType)) {
      console.log('[USB Upload] Converting to PDF...');
      pdfPath = await convertToPdf(tempPath, tempDir);
    }

    // Get page count
    const pageCount = await getPageCount(pdfPath);
    const estimatedCost = calculateJobCost(pageCount, 1, 'bw', null, null);
    const ticketNumber = getNextTicketNumber();
    const jobId = generateUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO jobs (id, ticket_number, status, color_mode, copies, page_count, estimated_cost, file_path, original_filename, file_size, mime_type, source, created_at, updated_at)
      VALUES (?, ?, 'waiting', 'bw', 1, ?, ?, ?, ?, ?, 'application/pdf', 'usb', ?, ?)
    `).run(jobId, ticketNumber, pageCount, estimatedCost, pdfPath, originalFilename, stat.size, now, now);

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);

    if (req.io) {
      req.io.to('staff').emit('job:submitted', { job });
    }

    const thumbnailUrls: string[] = [];
    for (let i = 0; i < Math.min(pageCount, 20); i++) {
      thumbnailUrls.push(`/api/files/${jobId}/thumbnail/${i}`);
    }

    res.status(201).json({ job, ticketNumber, thumbnailUrls });

    generateThumbnails(pdfPath, jobId, tempDir, 20).catch((err) => {
      console.error('[USB Upload] Thumbnail generation failed:', err);
    });
  } catch (error: any) {
    console.error('[USB Upload] Failed:', error);
    res.status(500).json({ error: 'Upload from USB failed' });
  }
};

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return map[ext] || 'application/octet-stream';
}
