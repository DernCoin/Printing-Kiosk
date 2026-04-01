export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const;

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.png',
  '.jpg',
  '.jpeg',
] as const;

// Map MIME types to human-readable labels
export const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'image/png': 'PNG Image',
  'image/jpeg': 'JPEG Image',
  'image/jpg': 'JPEG Image',
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
