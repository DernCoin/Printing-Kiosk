import { db, generateUUID } from '../utils/db/index.js';
import { secureDelete, deleteJobThumbnails } from '../utils/secureDelete.js';
import path from 'path';

interface JobRow {
  id: string;
  ticket_number: number;
  status: string;
  page_count: number;
  estimated_cost: number;
  color_mode: string;
  copies: number;
  source: string;
  original_filename: string;
  file_path: string | null;
  created_at: string;
  completed_at: string | null;
}

interface SettingRow {
  value: string;
}

/**
 * Clean up expired jobs — delete files, archive metadata.
 */
export async function cleanupExpiredJobs(tempDir: string, io?: any): Promise<number> {
  const timeoutSetting = db.prepare(
    "SELECT value FROM settings WHERE key = 'job_timeout_minutes'"
  ).get() as SettingRow | undefined;

  const timeoutMinutes = timeoutSetting ? parseInt(timeoutSetting.value, 10) : 30;

  // Find expired waiting jobs
  const expiredJobs = db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'waiting'
    AND created_at < datetime('now', '-${timeoutMinutes} minutes')
  `).all() as JobRow[];

  // Also find completed/rejected jobs that still have files (belt and suspenders)
  const doneJobs = db.prepare(`
    SELECT * FROM jobs
    WHERE status IN ('completed', 'rejected')
    AND file_path IS NOT NULL
  `).all() as JobRow[];

  const allJobs = [...expiredJobs, ...doneJobs];
  let cleaned = 0;

  for (const job of allJobs) {
    try {
      // Secure delete the file
      if (job.file_path) {
        await secureDelete(job.file_path);
      }

      // Delete thumbnails
      await deleteJobThumbnails(tempDir, job.id);

      // Archive to job_history
      db.prepare(`
        INSERT OR IGNORE INTO job_history (id, ticket_number, status, page_count, estimated_cost, color_mode, copies, source, original_filename, created_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        generateUUID(),
        job.ticket_number,
        job.status === 'waiting' ? 'expired' : job.status,
        job.page_count,
        job.estimated_cost,
        job.color_mode,
        job.copies,
        job.source,
        job.original_filename,
        job.created_at,
        job.completed_at || new Date().toISOString(),
      );

      // Delete from active jobs
      db.prepare('DELETE FROM jobs WHERE id = ?').run(job.id);

      cleaned++;
      console.log('[Cleanup] Cleaned job:', job.id, `(ticket #${job.ticket_number})`);
    } catch (error) {
      console.error('[Cleanup] Failed to clean job:', job.id, error);
    }
  }

  if (cleaned > 0 && io) {
    // Broadcast updated queue
    const remainingJobs = db.prepare(
      "SELECT * FROM jobs WHERE status IN ('waiting', 'reviewing', 'printing') ORDER BY created_at ASC"
    ).all();
    io.to('staff').emit('queue:updated', { jobs: remainingJobs });
    io.to('patron').emit('queue:updated', { jobs: remainingJobs });
  }

  return cleaned;
}

/**
 * Clean up a single job's files (after printing or rejection).
 */
export async function cleanupJobFiles(jobId: string, tempDir: string): Promise<void> {
  const job = db.prepare('SELECT file_path FROM jobs WHERE id = ?').get(jobId) as { file_path: string | null } | undefined;

  if (job?.file_path) {
    await secureDelete(job.file_path);
    db.prepare('UPDATE jobs SET file_path = NULL, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), jobId);
  }

  await deleteJobThumbnails(tempDir, jobId);
}
