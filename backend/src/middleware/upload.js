/**
 * ETU Diagnostic Laboratory — File Upload Middleware
 *
 * Multer configuration for handling profile photo uploads.
 * Validates file type (JPEG, PNG, WebP) and enforces a 2 MB size limit.
 */

import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { AppError } from '../utils/appError.js';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'photos');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `photo-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP images are allowed.', 422), false);
  }
}

export const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});
