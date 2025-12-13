/**
 * Image Upload Routes
 * Handles property image uploads with Multer
 */

import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { getStorageProvider } from '../storage/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router: Router = express.Router();

// Configure Multer for memory storage (we'll process with Sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

/**
 * POST /upload/property-image
 * Upload a single property image
 */
router.post(
  '/property-image',
  authenticateToken,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const storage = getStorageProvider();
      const imageVariants = await storage.uploadImage(req.file, 'properties');

      return res.status(200).json({
        success: true,
        data: imageVariants,
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /upload/property-images
 * Upload multiple property images (max 10)
 */
router.post(
  '/property-images',
  authenticateToken,
  upload.array('images', 10),
  async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No image files provided' });
      }

      const storage = getStorageProvider();
      const imageVariants = await storage.uploadImages(req.files, 'properties');

      return res.status(200).json({
        success: true,
        data: imageVariants,
      });
    } catch (error) {
      console.error('Error uploading images:', error);
      return res.status(500).json({
        error: 'Failed to upload images',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /upload/property-document
 * Upload a single property document (PDF, etc.)
 */
router.post(
  '/property-document',
  authenticateToken,
  upload.single('document'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
      }

      const storage = getStorageProvider();
      const uploadedFile = await storage.uploadFile(req.file, 'documents');

      return res.status(200).json({
        success: true,
        data: uploadedFile,
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      return res.status(500).json({
        error: 'Failed to upload document',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
