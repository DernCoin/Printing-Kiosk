import { cleanupExpiredJobs } from '../services/fileCleanupService.js';
import { getTempDir } from '../utils/tempDir.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

async function runCleanup(io?: any): Promise<void> {
  try {
    const tempDir = getTempDir();
    const cleaned = await cleanupExpiredJobs(tempDir, io);
    if (cleaned > 0) {
      console.log(`[Cleanup] Cleaned ${cleaned} expired jobs`);
    }
  } catch (error) {
    console.error('[Cleanup] Worker error:', error);
  }
}

export function startCleanupWorker(io?: any): void {
  if (intervalId) return;

  // Run immediately on start
  runCleanup(io);

  // Then every minute
  intervalId = setInterval(() => runCleanup(io), 60 * 1000);
  console.log('[Cleanup] Worker started (60s interval)');
}

export function stopCleanupWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Cleanup] Worker stopped');
  }
}
