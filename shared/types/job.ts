export type JobStatus = 'waiting' | 'reviewing' | 'printing' | 'completed' | 'rejected';

export type ColorMode = 'bw' | 'color';

export type JobSource = 'phone' | 'usb';

export interface PrintSettings {
  colorMode: ColorMode;
  copies: number;
  pageRangeStart: number | null; // null = all pages
  pageRangeEnd: number | null;
}

export interface PrintJob {
  id: string;
  ticketNumber: number;
  status: JobStatus;
  colorMode: ColorMode;
  copies: number;
  pageRangeStart: number | null;
  pageRangeEnd: number | null;
  pageCount: number;
  estimatedCost: number; // cents
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  source: JobSource;
  rejectReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface QueueJob extends PrintJob {
  thumbnailUrl: string | null; // URL to first page thumbnail
}

export interface CreateJobResponse {
  job: PrintJob;
  ticketNumber: number;
  thumbnailUrls: string[];
}

export interface JobHistoryEntry {
  id: string;
  ticketNumber: number;
  status: JobStatus;
  pageCount: number;
  estimatedCost: number;
  colorMode: ColorMode;
  copies: number;
  source: JobSource;
  originalFilename: string;
  createdAt: string;
  completedAt: string | null;
}
