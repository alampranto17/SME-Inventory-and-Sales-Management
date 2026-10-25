import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

// ─────────────────────────────────────────────
// Settings for uploading a product photo (Multer)
// ─────────────────────────────────────────────
// The file is saved on this computer in:   backend/uploads/products/
// and the browser can open it at:          http://localhost:3000/uploads/products/<file>
// (main.ts makes the "uploads" folder public)
//
// Later you can switch to AWS S3 by changing only this file.

export const PRODUCT_IMAGE_FOLDER = join(process.cwd(), 'uploads', 'products');

// make sure the folder exists
if (!existsSync(PRODUCT_IMAGE_FOLDER)) {
  mkdirSync(PRODUCT_IMAGE_FOLDER, { recursive: true });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FIVE_MB = 5 * 1024 * 1024;

export const productImageOptions = {
  // 1. WHERE to save + WHAT name to give the file
  storage: diskStorage({
    destination: PRODUCT_IMAGE_FOLDER,
    filename: (_req, file, callback) => {
      // random name -> two photos called "rice.jpg" never overwrite each other
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),

  // 2. only real images
  fileFilter: (_req, file: Express.Multer.File, callback) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestException('Only JPG, PNG or WEBP images are allowed'),
        false,
      );
    }
    callback(null, true);
  },

  // 3. max 5 MB (rule from the project plan)
  limits: { fileSize: FIVE_MB },
};
