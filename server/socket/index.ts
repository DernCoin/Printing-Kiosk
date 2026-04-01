import type { Server, Socket } from 'socket.io';
import { registerQueueHandlers } from './queueHandlers.js';

export function setupSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Clients join their role room
    socket.on('join', ({ role }: { role: 'patron' | 'staff' }) => {
      socket.join(role);
      console.log(`[Socket] ${socket.id} joined room: ${role}`);
    });

    // Register handler groups
    registerQueueHandlers(socket, io);

    socket.on('disconnect', () => {
      console.log('[Socket] Client disconnected:', socket.id);
    });
  });
}
