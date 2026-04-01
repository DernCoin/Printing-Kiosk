import fs from 'fs';
import path from 'path';
import os from 'os';

const PRINTABLE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];

interface UsbFile {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  extension: string;
}

interface UsbDrive {
  name: string;
  mountPath: string;
}

/**
 * Detect mounted USB drives.
 * Linux: scans /media/{user}/ and /run/media/{user}/
 * macOS: scans /Volumes/
 * Windows: scans drive letters D: through Z:
 */
export function detectUsbDrives(): UsbDrive[] {
  const drives: UsbDrive[] = [];
  const platform = os.platform();

  if (platform === 'linux') {
    // Check /media/{user}/ and /run/media/{user}/
    const username = os.userInfo().username;
    const mediaPaths = [
      `/media/${username}`,
      `/run/media/${username}`,
      '/media',
    ];

    for (const mediaPath of mediaPaths) {
      try {
        if (!fs.existsSync(mediaPath)) continue;
        const entries = fs.readdirSync(mediaPath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() || entry.isSymbolicLink()) {
            const fullPath = path.join(mediaPath, entry.name);
            // Verify it's actually a mount point by checking if it's non-empty
            try {
              const contents = fs.readdirSync(fullPath);
              if (contents.length > 0) {
                drives.push({ name: entry.name, mountPath: fullPath });
              }
            } catch {
              // Permission denied or not readable
            }
          }
        }
      } catch {
        // Path doesn't exist or not readable
      }
    }
  } else if (platform === 'darwin') {
    // macOS: /Volumes/ (skip Macintosh HD)
    try {
      const entries = fs.readdirSync('/Volumes', { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'Macintosh HD') continue;
        drives.push({ name: entry.name, mountPath: path.join('/Volumes', entry.name) });
      }
    } catch {}
  } else if (platform === 'win32') {
    // Windows: check D: through Z:
    for (let code = 68; code <= 90; code++) { // D-Z
      const letter = `${String.fromCharCode(code)}:\\`;
      try {
        if (fs.existsSync(letter)) {
          fs.readdirSync(letter); // Verify accessible
          drives.push({ name: `${String.fromCharCode(code)}: Drive`, mountPath: letter });
        }
      } catch {}
    }
  }

  return drives;
}

/**
 * List printable files in a directory. Non-recursive for safety.
 * Only returns files with printable extensions and directories for navigation.
 */
export function listFiles(dirPath: string, allowedRoot: string): UsbFile[] {
  // Security: ensure the path is within the allowed root (USB mount point)
  const resolvedDir = path.resolve(dirPath);
  const resolvedRoot = path.resolve(allowedRoot);
  if (!resolvedDir.startsWith(resolvedRoot)) {
    throw new Error('Access denied: path is outside USB drive');
  }

  try {
    const entries = fs.readdirSync(resolvedDir, { withFileTypes: true });
    const files: UsbFile[] = [];

    for (const entry of entries) {
      // Skip hidden files/dirs
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(resolvedDir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();

      if (entry.isDirectory()) {
        files.push({
          name: entry.name,
          path: fullPath,
          size: 0,
          isDirectory: true,
          extension: '',
        });
      } else if (PRINTABLE_EXTENSIONS.includes(ext)) {
        try {
          const stat = fs.statSync(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            size: stat.size,
            isDirectory: false,
            extension: ext,
          });
        } catch {
          // Skip unreadable files
        }
      }
    }

    // Sort: directories first, then files alphabetically
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return files;
  } catch (error: any) {
    throw new Error(`Cannot read directory: ${error.message}`);
  }
}
