/**
 * Image Upload Routes
 * Handles property image uploads with Multer
 */

import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { getStorageProvider } from '../storage/index.js';
import { authenticateToken } from '../middleware/auth.js';

// Valid document categories
const VALID_DOCUMENT_CATEGORIES = ['grundriss', 'energieausweis', 'expose', 'sonstiges'] as const;
type DocumentCategory = typeof VALID_DOCUMENT_CATEGORIES[number];

const router: Router = express.Router();

// Configure Multer for memory storage (we'll process with Sharp)
const uploadImages = multer({
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

// Configure Multer for video uploads
const uploadVideos = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size for videos
  },
  fileFilter: (req, file, cb) => {
    // Accept only video files
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only MP4, MOV, WebM, and MPEG videos are allowed'));
    }
  },
});

// Configure Multer for document uploads (PDFs, images, etc.)
const uploadDocuments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size for documents
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'image/heif',
      'image/bmp',
      'image/tiff',
      'application/pdf',
    ];
    // Also accept any image/* type
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      console.error(`[Upload] Rejected file type: ${file.mimetype} (${file.originalname})`);
      cb(new Error(`File type not allowed: ${file.mimetype}`));
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
  uploadImages.single('image'),
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
  uploadImages.array('images', 10),
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
 * POST /upload/avatar
 * Upload a user avatar image
 */
router.post(
  '/avatar',
  authenticateToken,
  uploadImages.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No avatar file provided' });
      }

      const storage = getStorageProvider();
      const imageVariants = await storage.uploadImage(req.file, 'avatars');

      return res.status(200).json({
        success: true,
        data: imageVariants,
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return res.status(500).json({
        error: 'Failed to upload avatar',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /upload/property-video
 * Upload a single property video (max 100MB)
 */
router.post(
  '/property-video',
  authenticateToken,
  uploadVideos.single('video'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No video file provided' });
      }

      const storage = getStorageProvider();
      const videoResult = await storage.uploadVideo(req.file, 'properties/videos');

      return res.status(200).json({
        success: true,
        data: videoResult,
      });
    } catch (error) {
      console.error('Error uploading video:', error);
      return res.status(500).json({
        error: 'Failed to upload video',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * POST /upload/property-document
 * Upload a single property document (PDF, images) with optional category
 * Query param: ?category=grundriss|energieausweis|expose|sonstiges
 * For PDFs, generates a thumbnail from the first page
 * For images, generates image variants
 */
router.post(
  '/property-document',
  authenticateToken,
  uploadDocuments.single('document'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No document file provided' });
      }

      // Get and validate category from query parameter
      const categoryParam = req.query.category as string | undefined;
      const category: DocumentCategory = categoryParam && VALID_DOCUMENT_CATEGORIES.includes(categoryParam as DocumentCategory)
        ? (categoryParam as DocumentCategory)
        : 'sonstiges';

      const storage = getStorageProvider();
      const documentId = uuidv4();
      const uploadedAt = new Date().toISOString();

      // For PDFs, use uploadPdfWithThumbnail to generate first-page preview
      if (req.file.mimetype === 'application/pdf') {
        const uploadedFile = await storage.uploadPdfWithThumbnail(req.file, 'documents');
        return res.status(200).json({
          success: true,
          data: {
            id: documentId,
            url: uploadedFile.url,
            thumbnailUrl: uploadedFile.thumbnailUrl,
            filename: req.file.originalname,
            category,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedAt,
          },
        });
      }

      // For images, generate variants and use thumbnail
      if (req.file.mimetype.startsWith('image/')) {
        const imageVariants = await storage.uploadImage(req.file, 'documents');
        return res.status(200).json({
          success: true,
          data: {
            id: documentId,
            url: imageVariants.original,
            thumbnailUrl: imageVariants.thumbnail,
            filename: req.file.originalname,
            category,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedAt,
          },
        });
      }

      // For other documents, use regular upload
      const uploadedFile = await storage.uploadFile(req.file, 'documents');

      return res.status(200).json({
        success: true,
        data: {
          id: documentId,
          url: uploadedFile.url,
          thumbnailUrl: null,
          filename: req.file.originalname,
          category,
          mimetype: req.file.mimetype,
          size: req.file.size,
          uploadedAt,
        },
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
