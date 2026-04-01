import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { detectUsbDrives, listFiles } from '../services/usbService.js';
import { getTempDir } from '../utils/tempDir.js';
import { hostSpawn } from '../utils/hostSpawn.js';

const router = express.Router();

/**
 * GET /api/usb/drives — List detected USB drives.
 */
router.get('/drives', (_req: Request, res: Response) => {
  try {
    const drives = detectUsbDrives();
    res.json({ drives });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/usb/files?drive=...&path=... — List printable files in a directory on a USB drive.
 */
router.get('/files', (req: Request, res: Response) => {
  try {
    const drivePath = req.query.drive as string;
    const subPath = (req.query.path as string) || '';

    if (!drivePath) {
      res.status(400).json({ error: 'drive parameter is required' });
      return;
    }

    const drives = detectUsbDrives();
    const matchedDrive = drives.find((d) => d.mountPath === drivePath);
    if (!matchedDrive) {
      res.status(403).json({ error: 'Not a recognized USB drive' });
      return;
    }

    const fullPath = subPath ? `${drivePath}/${subPath}` : drivePath;
    const files = listFiles(fullPath, drivePath);

    res.json({
      drive: matchedDrive,
      currentPath: subPath,
      files,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/usb/preview?file=...&drive=... — Get a thumbnail preview of a file on a USB drive.
 *
 * - Images (PNG/JPG): resized to 200px wide via sharp or served raw if small
 * - PDFs: first page rendered to PNG via pdftoppm
 * - DOCX/DOC: returns 404 (too slow to convert for browsing)
 *
 * Previews are cached in temp/ by file hash so repeated requests are instant.
 */
router.get('/preview', async (req: Request, res: Response): Promise<void> => {
  try {
    const filePath = req.query.file as string;
    const drivePath = req.query.drive as string;

    if (!filePath || !drivePath) {
      res.status(400).json({ error: 'file and drive parameters are required' });
      return;
    }

    // Security: verify drive is real and file is within it
    const drives = detectUsbDrives();
    const matchedDrive = drives.find((d) => d.mountPath === drivePath);
    if (!matchedDrive) {
      res.status(403).json({ error: 'Not a recognized USB drive' });
      return;
    }

    const resolvedFile = path.resolve(filePath);
    const resolvedDrive = path.resolve(drivePath);
    if (!resolvedFile.startsWith(resolvedDrive)) {
      res.status(403).json({ error: 'File is outside USB drive' });
      return;
    }

    if (!fs.existsSync(resolvedFile)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const ext = path.extname(resolvedFile).toLowerCase();
    const tempDir = getTempDir();

    // Generate a cache key from file path + size + mtime
    const stat = fs.statSync(resolvedFile);
    const cacheKey = crypto
      .createHash('md5')
      .update(`${resolvedFile}:${stat.size}:${stat.mtimeMs}`)
      .digest('hex');
    const cachePath = path.join(tempDir, `usbpreview_${cacheKey}.png`);

    // Serve from cache if available
    if (fs.existsSync(cachePath)) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.sendFile(cachePath);
      return;
    }

    // Images: use pdftoppm... no, just serve a resized version
    // Actually, for images we can convert with ImageMagick or just serve the raw file
    // at a reasonable size. Let's use `convert` if available, or serve raw.
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      // Try to resize with ImageMagick/GraphicsMagick
      try {
        const proc = hostSpawn(
          ['convert', resolvedFile, '-resize', '300x300>', '-quality', '70', `png:${cachePath}`],
          { stdout: 'pipe', stderr: 'pipe' }
        );
        const exitCode = await proc.exited;
        if (exitCode === 0 && fs.existsSync(cachePath)) {
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.sendFile(cachePath);
          return;
        }
      } catch {}

      // Fallback: serve the original image directly (browser will scale it)
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.sendFile(resolvedFile);
      return;
    }

    // PDFs: render first page with pdftoppm
    if (ext === '.pdf') {
      try {
        const prefix = path.join(tempDir, `usbpreview_${cacheKey}_render`);
        const proc = hostSpawn(
          ['pdftoppm', '-png', '-singlefile', '-scale-to-x', '300', '-scale-to-y', '-1', '-f', '1', '-l', '1', resolvedFile, prefix],
          { stdout: 'pipe', stderr: 'pipe' }
        );
        const exitCode = await proc.exited;
        const renderedPath = `${prefix}.png`;

        if (exitCode === 0 && fs.existsSync(renderedPath)) {
          fs.renameSync(renderedPath, cachePath);
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=60');
          res.sendFile(cachePath);
          return;
        }
      } catch {}
    }

    // DOCX/DOC or anything else: no preview available
    res.status(204).send();
  } catch (error: any) {
    console.error('[USB Preview] Failed:', error);
    res.status(500).json({ error: 'Preview failed' });
  }
});

export default router;
