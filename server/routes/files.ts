import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, downloadFile, getThumbnail } from '../controllers/fileController.js';
import { uploadFromUsb } from '../controllers/usbUploadController.js';
import staffAuth from '../middleware/staffAuth.js';
import { getTempDir } from '../utils/tempDir.js';

const router = express.Router();

const tempDir = getTempDir();

// Multer config — save to temp/ with UUID filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];
    const allowedExts = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    // Accept by MIME type OR file extension (curl sends octet-stream)
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
    }
  },
});

// Upload (patron + phone — multipart file upload)
router.post('/upload', upload.single('file'), uploadFile);

// Upload from USB (server copies the file from a USB drive it can see)
router.post('/upload-from-usb', uploadFromUsb);

// Download (staff only)
router.get('/:jobId/download', staffAuth, downloadFile);

// Thumbnails (public)
router.get('/:jobId/thumbnail/:page', getThumbnail);

export default router;
