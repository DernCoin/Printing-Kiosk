/**
 * Format a cost in cents to a dollar string.
 * e.g., 150 -> "$1.50"
 */
export function formatCost(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Format a ticket number with zero-padding.
 * e.g., 7 -> "#007"
 */
export function formatTicketNumber(n: number): string {
  return `#${String(n).padStart(3, '0')}`;
}

/**
 * Format a page range for display.
 * e.g., (null, null, 10) -> "All 10 pages"
 * e.g., (2, 5, 10) -> "Pages 2-5"
 */
export function formatPageRange(
  start: number | null,
  end: number | null,
  totalPages: number,
): string {
  if (start === null && end === null) {
    return `All ${totalPages} page${totalPages === 1 ? '' : 's'}`;
  }
  const s = start ?? 1;
  const e = end ?? totalPages;
  if (s === e) {
    return `Page ${s}`;
  }
  return `Pages ${s}-${e}`;
}

/**
 * Format file size for display.
 * e.g., 1048576 -> "1.0 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
