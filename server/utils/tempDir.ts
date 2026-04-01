import path from 'path';
import fs from 'fs';

/**
 * Get the writable temp directory for file uploads, thumbnails, and temp PDFs.
 * Uses TEMP_DIR env var (set by Electron in production) or falls back to server/temp/.
 */
let resolved: string | null = null;

export function getTempDir(): string {
  if (resolved) return resolved;

  if (process.env.TEMP_DIR) {
    resolved = process.env.TEMP_DIR;
  } else {
    resolved = path.join(import.meta.dir, '../../temp');
  }

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }

  return resolved;
}
