import type { JobStatus } from '../types/job';

export const JOB_STATUSES: Record<JobStatus, JobStatus> = {
  waiting: 'waiting',
  reviewing: 'reviewing',
  printing: 'printing',
  completed: 'completed',
  rejected: 'rejected',
} as const;

export const STATUS_LABELS: Record<JobStatus, string> = {
  waiting: 'Waiting',
  reviewing: 'Reviewing',
  printing: 'Printing',
  completed: 'Completed',
  rejected: 'Rejected',
};
