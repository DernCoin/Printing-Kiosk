import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import msgpackParser from 'socket.io-msgpack-parser';
import { initDB } from './utils/db/index.js';
import { setupSocketHandlers } from './socket/index.js';
import { startCleanupWorker, stopCleanupWorker } from './workers/cleanupWorker.js';
import clientIdentity from './middleware/clientIdentity.js';
import { getServerAddress, detectLanIP } from './utils/networkAddress.js';
import jobRoutes from './routes/jobs.js';
import fileRoutes from './routes/files.js';
import settingsRoutes from './routes/settings.js';
import printerRoutes from './routes/printer.js';
import usbRoutes from './routes/usb.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  parser: msgpackParser,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket'],
  perMessageDeflate: {
    threshold: 1024,
    zlibDeflateOptions: { level: 6 },
  },
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors());
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['accept'] === 'text/event-stream') return false;
    return compression.filter(req, res);
  },
}));
app.use(express.json());
app.use(clientIdentity);

// Attach io to requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.io = io;
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
});
app.use('/api', limiter);

// Static files
app.use('/phone-upload', express.static(path.join(import.meta.dir, 'public/phone-upload')));
app.use('/public/fonts', express.static(path.join(import.meta.dir, 'public/fonts')));

// Staff web dashboard — served as static files at root (after API routes)
const staffWebDir = process.env.STAFF_WEB_DIR || path.join(import.meta.dir, '../apps/staff/dist/web');

// API routes
app.use('/api/jobs', jobRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/printer', printerRoutes);
app.use('/api/usb', usbRoutes);

// Server info — clients use this to build QR codes and connect from other devices
app.get('/api/server-info', (_req: Request, res: Response) => {
  const address = getServerAddress(PORT);
  res.json({
    address,
    port: Number(PORT),
    lanIp: detectLanIP(),
    phoneUploadUrl: `${address}/phone-upload/`,
    staffDashboardUrl: `${address}/`,
  });
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'print-kiosk', timestamp: new Date().toISOString() });
});

// Staff web dashboard — static files served at root, after all API routes
app.use(express.static(staffWebDir));
// SPA fallback: any unmatched GET request serves the staff index.html
app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(staffWebDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Socket.IO handlers
setupSocketHandlers(io);

// Check for required host tools at startup
async function checkHostTools() {
  const tools = [
    { cmd: 'libreoffice', pkg: 'libreoffice', purpose: 'DOCX/DOC/image to PDF conversion' },
    { cmd: 'pdftoppm', pkg: 'poppler-utils', purpose: 'PDF thumbnail generation' },
    { cmd: 'lp', pkg: 'cups', purpose: 'printing' },
    { cmd: 'lpstat', pkg: 'cups', purpose: 'printer discovery' },
    { cmd: 'convert', pkg: 'ImageMagick', purpose: 'USB image preview resizing' },
  ];

  const { hostSpawn } = await import('./utils/hostSpawn.js');

  for (const tool of tools) {
    try {
      const proc = hostSpawn(['which', tool.cmd], { stdout: 'pipe', stderr: 'pipe' });
      const exitCode = await proc.exited;
      if (exitCode !== 0) {
        console.warn(`[Server] WARNING: '${tool.cmd}' not found — ${tool.purpose} will not work. Install: sudo dnf install ${tool.pkg}`);
      }
    } catch {
      console.warn(`[Server] WARNING: '${tool.cmd}' not found — ${tool.purpose} will not work. Install: sudo dnf install ${tool.pkg}`);
    }
  }
}

// Initialize database and start server
const PORT = process.env.PORT || 3000;

try {
  initDB();

  server.listen(Number(PORT), '0.0.0.0', async () => {
    const lanIp = detectLanIP();
    const address = getServerAddress(PORT);
    console.log(`[Server] Print Kiosk running on port ${PORT}`);
    console.log(`[Server] LAN address: ${address}`);
    console.log(`[Server] Phone upload: ${address}/phone-upload/`);
    console.log(`[Server] Health check: ${address}/health`);

    // Check for required system tools
    await checkHostTools();

    // Start cleanup worker
    startCleanupWorker(io);
  });
} catch (error) {
  console.error('[Server] Failed to initialize:', error);
  process.exit(1);
}

// Graceful shutdown
const shutdown = (signal: string): void => {
  console.log(`${signal} received: shutting down`);
  stopCleanupWorker();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
