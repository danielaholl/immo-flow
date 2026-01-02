/**
 * Interest Rates REST Routes
 * Express routes for admin UI to manage interest rate updates
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getStorageProvider } from '../storage/index.js';
import {
  extractInterestRatesFromImage,
  saveInterestRateUpdate,
  getCurrentInterestRate,
  getInterestRateHistory,
  getInterestRateMatrix,
  listInterestRateUpdates,
} from '../services/interest-rate-extractor.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('interest-rates-routes');
const router: ReturnType<typeof Router> = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien erlaubt'));
    }
  },
});

// =====================================================
// PUBLIC ENDPOINTS (for calculator)
// =====================================================

/**
 * GET /api/interest-rates/current
 * Get current interest rate based on parameters
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const loanToValue = parseInt(req.query.ltv as string) || 80;
    const fixedYears = parseInt(req.query.years as string) || 10;
    const propertyValue = parseInt(req.query.propertyValue as string) || 250000;

    const result = await getCurrentInterestRate(loanToValue, fixedYears, propertyValue);

    if (!result) {
      return res.status(404).json({ error: 'Keine Zinsdaten verfuegbar' });
    }

    res.json(result);
  } catch (error) {
    log.error('Error fetching current rate:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Zinsen' });
  }
});

/**
 * GET /api/interest-rates/history
 * Get historical rates for charts
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const weeks = parseInt(req.query.weeks as string) || 10;
    const history = await getInterestRateHistory(weeks);
    res.json({ history });
  } catch (error) {
    log.error('Error fetching history:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Historie' });
  }
});

/**
 * GET /api/interest-rates/matrix
 * Get full rate matrix for latest update
 */
router.get('/matrix', async (req: Request, res: Response) => {
  try {
    const result = await getInterestRateMatrix();

    if (!result.update) {
      return res.status(404).json({ error: 'Keine Zinsdaten verfuegbar' });
    }

    res.json(result);
  } catch (error) {
    log.error('Error fetching matrix:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Matrix' });
  }
});

// =====================================================
// ADMIN ENDPOINTS (require authentication)
// =====================================================

/**
 * POST /api/interest-rates/upload
 * Upload and process interest rate image
 */
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Kein Bild hochgeladen' });
    }

    log.info(`Processing interest rate image upload: ${req.file.originalname}`);

    // Upload image to storage
    let imageUrl: string | null = null;
    try {
      const storage = getStorageProvider();
      const imageResult = await storage.uploadImage(req.file, 'interest-rates');
      imageUrl = imageResult.original;
      log.info(`Image uploaded to: ${imageUrl}`);
    } catch (storageError) {
      log.warn('Could not upload image to storage, continuing without storage:', storageError);
    }

    // Convert to base64 for OpenAI
    const imageBase64 = req.file.buffer.toString('base64');

    // Extract interest rate data via OpenAI Vision
    log.info('Extracting interest rate data via OpenAI Vision...');
    const extractedData = await extractInterestRatesFromImage(imageBase64);

    // Save to database
    log.info('Saving extracted data to database...');
    const updateId = await saveInterestRateUpdate(extractedData, imageUrl);

    res.json({
      success: true,
      updateId,
      data: extractedData,
      imageUrl,
    });
  } catch (error) {
    log.error('Error processing interest rate image:', error);
    res.status(500).json({
      error: 'Fehler bei der Verarbeitung',
      details: error instanceof Error ? error.message : 'Unbekannter Fehler',
    });
  }
});

/**
 * GET /api/interest-rates/updates
 * List all updates (paginated)
 */
router.get('/updates', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

    const result = await listInterestRateUpdates(page, pageSize);
    res.json(result);
  } catch (error) {
    log.error('Error fetching updates:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Updates' });
  }
});

/**
 * GET /api/interest-rates/updates/:id
 * Get specific update with full matrix
 */
router.get('/updates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getInterestRateMatrix(id);

    if (!result.update) {
      return res.status(404).json({ error: 'Update nicht gefunden' });
    }

    res.json(result);
  } catch (error) {
    log.error('Error fetching update:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen des Updates' });
  }
});

/**
 * GET /api/interest-rates/stats
 * Get statistics for admin dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get latest update
    const { update, matrix } = await getInterestRateMatrix();

    // Get total count
    const result = await listInterestRateUpdates(1, 1);

    // Calculate some stats from the matrix
    let minRate = Infinity;
    let maxRate = -Infinity;
    for (const entry of matrix) {
      if (entry.interestRate < minRate) minRate = entry.interestRate;
      if (entry.interestRate > maxRate) maxRate = entry.interestRate;
    }

    res.json({
      totalUpdates: result.pagination.total,
      latestUpdate: update
        ? {
            calendarWeek: update.calendarWeek,
            year: update.year,
            topRate: update.topRate,
            uploadDate: update.uploadDate,
          }
        : null,
      matrixStats: {
        totalEntries: matrix.length,
        minRate: minRate === Infinity ? null : minRate,
        maxRate: maxRate === -Infinity ? null : maxRate,
      },
    });
  } catch (error) {
    log.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

export default router;
