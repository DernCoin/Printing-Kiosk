import fs from 'fs';

/**
 * Securely delete a file by overwriting with zeros before unlinking.
 * Prevents recovery of sensitive patron documents.
 */
export async function secureDelete(filePath: string): Promise<void> {
  try {
    if (!fs.existsSync(filePath)) return;

    const stat = fs.statSync(filePath);
    const fd = fs.openSync(filePath, 'w');
    const chunkSize = Math.min(stat.size, 1024 * 1024); // 1MB chunks
    const zeros = Buffer.alloc(chunkSize);
    let written = 0;

    while (written < stat.size) {
      const toWrite = Math.min(chunkSize, stat.size - written);
      fs.writeSync(fd, zeros, 0, toWrite);
      written += toWrite;
    }

    fs.closeSync(fd);
    fs.unlinkSync(filePath);
    console.log('[SecureDelete] Deleted:', filePath);
  } catch (error) {
    console.error('[SecureDelete] Failed:', filePath, error);
    // Fallback: try simple unlink
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // File may already be gone
    }
  }
}

/**
 * Delete all thumbnails for a job.
 */
export async function deleteJobThumbnails(tempDir: string, jobId: string): Promise<void> {
  try {
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (file.startsWith(`${jobId}_thumb_`)) {
        const thumbPath = `${tempDir}/${file}`;
        fs.unlinkSync(thumbPath);
        console.log('[SecureDelete] Deleted thumbnail:', thumbPath);
      }
    }
  } catch (error) {
    console.error('[SecureDelete] Failed to delete thumbnails for job:', jobId, error);
  }
}
