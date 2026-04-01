import { create } from 'zustand';

interface Job {
  id: string;
  ticket_number: number;
  status: string;
  color_mode: string;
  copies: number;
  page_range_start: number | null;
  page_range_end: number | null;
  page_count: number;
  estimated_cost: number;
  file_path: string | null;
  original_filename: string;
  file_size: number;
  mime_type: string;
  source: string;
  reject_reason: string | null;
  printed: number;
  paid: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface QueueState {
  jobs: Job[];
  isLoading: boolean;
  selectedJobId: string | null;
  newJobTicket: number | null; // for alert notification

  setJobs: (jobs: Job[]) => void;
  addJob: (job: Job) => void;
  updateJob: (job: Job) => void;
  updateJobStatus: (jobId: string, status: string, rejectReason?: string) => void;
  setSelectedJob: (jobId: string | null) => void;
  setNewJobTicket: (ticket: number | null) => void;
  setLoading: (loading: boolean) => void;
  getSelectedJob: () => Job | undefined;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  jobs: [],
  isLoading: false,
  selectedJobId: null,
  newJobTicket: null,

  setJobs: (jobs) => set({ jobs }),

  addJob: (job) => {
    set((state) => {
      if (state.jobs.some((j) => j.id === job.id)) return state;
      return { jobs: [...state.jobs, job] };
    });
  },

  updateJob: (job) => {
    set((state) => ({
      jobs: state.jobs.map((j) => j.id === job.id ? { ...j, ...job } : j),
    }));
  },

  updateJobStatus: (jobId, status, rejectReason) => {
    set((state) => ({
      jobs: state.jobs.map((j) =>
        j.id === jobId
          ? { ...j, status, reject_reason: rejectReason || j.reject_reason, updated_at: new Date().toISOString() }
          : j
      ),
    }));
  },

  setSelectedJob: (jobId) => set({ selectedJobId: jobId }),
  setNewJobTicket: (ticket) => set({ newJobTicket: ticket }),
  setLoading: (loading) => set({ isLoading: loading }),

  getSelectedJob: () => {
    const { jobs, selectedJobId } = get();
    return jobs.find((j) => j.id === selectedJobId);
  },
}));
