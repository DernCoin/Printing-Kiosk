import type { Server, Socket } from 'socket.io';
import { db } from '../utils/db/index.js';

interface JobRow {
  id: string;
  ticket_number: number;
  status: string;
  color_mode: string;
  copies: number;
  page_count: number;
  estimated_cost: number;
  original_filename: string;
  source: string;
  created_at: string;
}

export function registerQueueHandlers(socket: Socket, io: Server): void {
  // Request current queue
  socket.on('queue:request', () => {
    const jobs = db.prepare(
      "SELECT * FROM jobs WHERE status IN ('waiting', 'reviewing', 'printing') ORDER BY created_at ASC"
    ).all() as JobRow[];

    socket.emit('queue:updated', { jobs });
  });

  // Patron subscribes to their job status
  socket.on('job:subscribe', ({ jobId }: { jobId: string }) => {
    socket.join(`job:${jobId}`);
    console.log(`[Socket] ${socket.id} subscribed to job: ${jobId}`);
  });

  socket.on('job:unsubscribe', ({ jobId }: { jobId: string }) => {
    socket.leave(`job:${jobId}`);
  });
}
