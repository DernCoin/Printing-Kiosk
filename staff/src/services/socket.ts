import { io, Socket } from 'socket.io-client';
import msgpackParser from 'socket.io-msgpack-parser';
import { useSetupStore } from '../store/setupStore';
import { useQueueStore } from '../store/queueStore';
import { playNewJobSound } from './notificationSound';

class StaffSocketService {
  private socket: Socket | null = null;

  private getServerUrl(): string {
    // When served by the kiosk server (port 3000), use same-origin
    if (typeof window !== 'undefined' && window.location.port === '3000') {
      return window.location.origin;
    }
    return useSetupStore.getState().serverUrl;
  }

  connect() {
    if (this.socket?.connected) return;

    const serverUrl = this.getServerUrl();

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }

    this.socket = io(serverUrl, {
      parser: msgpackParser,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    this.socket.on('connect', () => {
      console.log('[StaffSocket] Connected');
      this.socket?.emit('join', { role: 'staff' });
      // Request current queue on connect
      this.socket?.emit('queue:request');
    });

    this.socket.on('disconnect', () => {
      console.log('[StaffSocket] Disconnected');
    });

    // Handle queue events
    this.socket.on('job:submitted', (data: any) => {
      console.log('[StaffSocket] New job:', data.job?.ticket_number);
      if (data.job) {
        useQueueStore.getState().addJob(data.job);
        useQueueStore.getState().setNewJobTicket(data.job.ticket_number);
        playNewJobSound();
      }
    });

    this.socket.on('job:status-changed', (data: any) => {
      console.log('[StaffSocket] Job status changed:', data.jobId, data.status);
      useQueueStore.getState().updateJobStatus(data.jobId, data.status, data.rejectReason);
    });

    this.socket.on('job:updated', (data: any) => {
      console.log('[StaffSocket] Job updated:', data.job?.id);
      if (data.job) {
        useQueueStore.getState().updateJob(data.job);
      }
    });

    this.socket.on('queue:updated', (data: any) => {
      if (data.jobs) {
        useQueueStore.getState().setJobs(data.jobs);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const staffSocket = new StaffSocketService();
