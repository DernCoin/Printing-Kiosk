import type { Request, Response } from 'express';
import { db, generateUUID } from '../utils/db/index.js';
import { calculateJobCost } from '../services/pricingService.js';
import { cleanupJobFiles } from '../services/fileCleanupService.js';
import { getTempDir } from '../utils/tempDir.js';

interface JobRow {
  id: string;
  ticket_number: number;
  status: string;
  color_mode: string;
  copies: number;
  page_range_start: number | null;
  page_range_end: number | null;
  page_count: number;
  estimated_cost: number;
  file_path: string | null;
  original_filename: string;
  file_size: number;
  mime_type: string;
  source: string;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface SequenceRow {
  next_value: number;
}

interface SettingRow { value: string; }

/**
 * Get the next ticket number. Derived purely from existing data — no separate counter.
 * Checks both active jobs and history so it never collides.
 */
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
 * GET /api/jobs — Get the active job queue
 */
export const getJobs = (req: Request, res: Response): void => {
  try {
    const jobs = db.prepare(
      "SELECT * FROM jobs WHERE status IN ('waiting', 'reviewing', 'printing') ORDER BY created_at ASC"
    ).all() as JobRow[];

    res.json({ jobs });
  } catch (error) {
    console.error('[Jobs] Failed to get jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
};

/**
 * GET /api/jobs/:id — Get a specific job
 */
export const getJob = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;

    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
  } catch (error) {
    console.error('[Jobs] Failed to get job:', error);
    res.status(500).json({ error: 'Failed to get job' });
  }
};

/**
 * POST /api/jobs — Create a new print job.
 * Called after file upload + conversion + page count.
 */
export const createJob = (req: Request, res: Response): void => {
  try {
    const {
      filePath,
      originalFilename,
      fileSize,
      mimeType,
      pageCount,
      source = 'usb',
      colorMode = 'bw',
      copies = 1,
      pageRangeStart = null,
      pageRangeEnd = null,
    } = req.body;

    if (!filePath || !originalFilename || !mimeType) {
      res.status(400).json({ error: 'filePath, originalFilename, and mimeType are required' });
      return;
    }

    const id = generateUUID();
    const ticketNumber = getNextTicketNumber();
    const estimatedCost = calculateJobCost(pageCount || 0, copies, colorMode, pageRangeStart, pageRangeEnd);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO jobs (id, ticket_number, status, color_mode, copies, page_range_start, page_range_end, page_count, estimated_cost, file_path, original_filename, file_size, mime_type, source, created_at, updated_at)
      VALUES (?, ?, 'waiting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, ticketNumber, colorMode, copies,
      pageRangeStart, pageRangeEnd,
      pageCount || 0, estimatedCost,
      filePath, originalFilename, fileSize || 0, mimeType,
      source, now, now,
    );

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow;

    // Broadcast to staff
    if (req.io) {
      req.io.to('staff').emit('job:submitted', { job });
    }

    res.status(201).json({ job, ticketNumber });
  } catch (error) {
    console.error('[Jobs] Failed to create job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
};

/**
 * PATCH /api/jobs/:id/settings — Update job print settings (patron configuring).
 */
export const updateJobSettings = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { colorMode, duplex, copies, pageRangeStart, pageRangeEnd } = req.body;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const newColorMode = colorMode ?? job.color_mode;
    const newDuplex = duplex !== undefined ? (duplex ? 1 : 0) : (job as any).duplex ?? 0;
    const newCopies = copies ?? job.copies;
    const newStart = pageRangeStart !== undefined ? pageRangeStart : job.page_range_start;
    const newEnd = pageRangeEnd !== undefined ? pageRangeEnd : job.page_range_end;
    const estimatedCost = calculateJobCost(job.page_count, newCopies, newColorMode, newStart, newEnd);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE jobs SET color_mode = ?, duplex = ?, copies = ?, page_range_start = ?, page_range_end = ?, estimated_cost = ?, updated_at = ?
      WHERE id = ?
    `).run(newColorMode, newDuplex, newCopies, newStart, newEnd, estimatedCost, now, id);

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow;

    // Broadcast updated job to staff so queue reflects new settings
    if (req.io) {
      req.io.to('staff').emit('job:updated', { job: updated });
    }

    res.json({ job: updated });
  } catch (error) {
    console.error('[Jobs] Failed to update job settings:', error);
    res.status(500).json({ error: 'Failed to update job settings' });
  }
};

/**
 * PATCH /api/jobs/:id/status — Change job status (staff action).
 */
export const updateJobStatus = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { status, rejectReason } = req.body;

    const validStatuses = ['waiting', 'reviewing', 'printing', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const now = new Date().toISOString();
    const completedAt = (status === 'completed' || status === 'rejected') ? now : null;

    db.prepare(`
      UPDATE jobs SET status = ?, reject_reason = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `).run(status, rejectReason || null, now, completedAt, id);

    // If completed or rejected, clean up files and archive to history
    if (status === 'completed' || status === 'rejected') {
      cleanupJobFiles(id, getTempDir()).catch((err) => {
        console.error('[Jobs] Failed to cleanup files for job:', id, err);
      });

      // Archive to history immediately
      const finishedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow;
      if (finishedJob) {
        db.prepare(`
          INSERT OR IGNORE INTO job_history (id, ticket_number, status, page_count, estimated_cost, color_mode, copies, source, original_filename, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          generateUUID(), finishedJob.ticket_number, status,
          finishedJob.page_count, finishedJob.estimated_cost,
          finishedJob.color_mode, finishedJob.copies,
          finishedJob.source, finishedJob.original_filename,
          finishedJob.created_at, completedAt,
        );
        // Remove from active jobs
        db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
      }
    }

    // Broadcast status change
    if (req.io) {
      req.io.to('staff').emit('job:status-changed', { jobId: id, status, rejectReason });
      req.io.to('patron').emit('job:status-changed', { jobId: id, status, rejectReason });
    }

    // Job may have been deleted (completed/rejected) — return the last known state
    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    res.json({ job: updated || { ...job, status, reject_reason: rejectReason || null, completed_at: completedAt } });
  } catch (error) {
    console.error('[Jobs] Failed to update job status:', error);
    res.status(500).json({ error: 'Failed to update job status' });
  }
};

/**
 * PATCH /api/jobs/:id/paid — Toggle paid status. Auto-completes if also printed.
 */
export const markPaid = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

    const nowPaid = (job as any).paid ? 0 : 1; // toggle
    const nowPrinted = (job as any).printed || 0;
    const now = new Date().toISOString();

    // If both printed and paid, auto-complete
    const newStatus = (nowPaid && nowPrinted) ? 'completed' : job.status;
    const completedAt = (nowPaid && nowPrinted) ? now : null;

    db.prepare('UPDATE jobs SET paid = ?, status = ?, completed_at = COALESCE(?, completed_at), updated_at = ? WHERE id = ?')
      .run(nowPaid, newStatus, completedAt, now, id);

    // If completed, clean up files + archive
    if (newStatus === 'completed') {
      cleanupJobFiles(id, getTempDir()).catch(() => {});
      const finishedJob = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow;
      if (finishedJob) {
        db.prepare(`
          INSERT OR IGNORE INTO job_history (id, ticket_number, status, page_count, estimated_cost, color_mode, copies, source, original_filename, created_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(generateUUID(), finishedJob.ticket_number, 'completed', finishedJob.page_count, finishedJob.estimated_cost, finishedJob.color_mode, finishedJob.copies, finishedJob.source, finishedJob.original_filename, finishedJob.created_at, completedAt);
        db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
      }
    }

    if (req.io) {
      req.io.to('staff').emit('job:updated', { job: db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) || { ...job, paid: nowPaid, status: newStatus } });
    }

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    res.json({ job: updated || { ...job, paid: nowPaid, status: newStatus, completed_at: completedAt } });
  } catch (error) {
    console.error('[Jobs] Failed to mark paid:', error);
    res.status(500).json({ error: 'Failed to mark paid' });
  }
};

/**
 * DELETE /api/jobs/:id — Delete a job (staff only).
 */
export const deleteJob = (req: Request, res: Response): void => {
  try {
    const { id } = req.params;

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Clean up files
    cleanupJobFiles(id, getTempDir()).catch((err) => {
      console.error('[Jobs] Failed to cleanup files for deleted job:', id, err);
    });

    db.prepare('DELETE FROM jobs WHERE id = ?').run(id);

    if (req.io) {
      req.io.to('staff').emit('queue:updated', { jobs: [] }); // Client will refetch
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Jobs] Failed to delete job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};

/**
 * GET /api/jobs/history — Get historical jobs (metadata only).
 */
export const getJobHistory = (req: Request, res: Response): void => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const jobs = db.prepare(
      'SELECT * FROM job_history ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM job_history').get() as { count: number };

    res.json({ jobs, total: total.count });
  } catch (error) {
    console.error('[Jobs] Failed to get job history:', error);
    res.status(500).json({ error: 'Failed to get job history' });
  }
};
