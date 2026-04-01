import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '../constants/fileTypes';

export function isAllowedFileType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isFileSizeOk(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_FILE_SIZE;
}

export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.slice(lastDot).toLowerCase();
}
