import { useSetupStore } from '../store/setupStore';

/** When served by the kiosk server, use same-origin. Otherwise use the store (dev mode). */
function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.port === '3000') {
    return window.location.origin;
  }
  return useSetupStore.getState().serverUrl;
}

function getStaffPin(): string {
  return '';
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-client-type': 'staff',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function staffRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return request<T>(endpoint, {
    ...options,
    headers: {
      'x-staff-pin': getStaffPin(),
      ...options?.headers,
    },
  });
}

export const staffApi = {
  // Health
  checkHealth: () => request<{ status: string }>('/health'),

  // Queue
  getJobs: () => request<{ jobs: any[] }>('/api/jobs'),
  getJob: (id: string) => request<{ job: any }>(`/api/jobs/${id}`),

  // Job actions
  updateJobStatus: (id: string, status: string, rejectReason?: string) =>
    staffRequest<{ job: any }>(`/api/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejectReason }),
    }),

  markPaid: (id: string) =>
    staffRequest<{ job: any }>(`/api/jobs/${id}/paid`, { method: 'PATCH' }),

  deleteJob: (id: string) =>
    staffRequest<{ success: boolean }>(`/api/jobs/${id}`, { method: 'DELETE' }),

  // History
  getJobHistory: (limit = 50, offset = 0) =>
    request<{ jobs: any[]; total: number }>(`/api/jobs/history?limit=${limit}&offset=${offset}`),

  // Settings
  getSettings: () => request<{ settings: Record<string, string> }>('/api/settings'),

  updateSetting: (key: string, value: string) =>
    staffRequest<{ key: string; value: string }>(`/api/settings/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  updateSettings: (settings: Record<string, string>) =>
    staffRequest<{ success: boolean }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),

  // Printers
  listPrinters: () => staffRequest<{ printers: any[]; systemAvailable: boolean }>('/api/printer/list'),

  addPrinter: (name: string, ippUrl: string) =>
    staffRequest<{ printer: any }>('/api/printer', {
      method: 'POST',
      body: JSON.stringify({ name, ipp_url: ippUrl }),
    }),

  removePrinter: (id: string) =>
    staffRequest<{ success: boolean }>(`/api/printer/${id}`, { method: 'DELETE' }),

  activatePrinter: (id: string) =>
    staffRequest<{ printer: any }>(`/api/printer/${id}/activate`, { method: 'PATCH' }),

  testPrinter: (id: string) =>
    staffRequest<{ success: boolean; message: string }>(`/api/printer/${id}/test`, { method: 'POST' }),

  // Print a job (server handles everything — no file download)
  printJob: (jobId: string) =>
    staffRequest<{ success: boolean; message: string; printerName?: string }>(`/api/printer/print/${jobId}`, { method: 'POST' }),

  // Thumbnail URL (low-res preview PNGs, not the actual document)
  getThumbnailUrl: (jobId: string, page: number) =>
    `${getBaseUrl()}/api/files/${jobId}/thumbnail/${page}`,
};
