/**
 * Market Data REST Routes
 * Express routes for admin UI to manage PLZ market data
 */
import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import {
  getMarketDataByPLZ,
  getMarketDataStats,
  getPLZWithoutPrices,
  getAllPLZForUpdate,
  estimateMarketDataBatch,
  updateMarketDataInDB,
  saveMarketDataSnapshot,
} from '../services/plz-market-estimator.js';

const router: ReturnType<typeof Router> = Router();

// Get market data statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getMarketDataStats();

    // Get count by federal state
    const stateStats = await query(
      `SELECT federal_state, COUNT(*)::int as total,
              COUNT(avg_purchase_price_sqm)::int as with_prices
       FROM plz_market_data
       GROUP BY federal_state
       ORDER BY total DESC`
    );

    res.json({
      stats,
      byState: stateStats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// List PLZ with pagination and filters
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const offset = (page - 1) * pageSize;
    const state = req.query.state as string;
    const city = req.query.city as string;
    const onlyWithoutPrices = req.query.onlyWithoutPrices === 'true';

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (state) {
      whereClause += ` AND federal_state ILIKE $${paramIndex}`;
      params.push(`%${state}%`);
      paramIndex++;
    }

    if (city) {
      whereClause += ` AND (city ILIKE $${paramIndex} OR district ILIKE $${paramIndex})`;
      params.push(`%${city}%`);
      paramIndex++;
    }

    if (onlyWithoutPrices) {
      whereClause += ` AND avg_purchase_price_sqm IS NULL`;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total FROM plz_market_data WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get data
    params.push(pageSize, offset);
    const data = await query(
      `SELECT plz, city, stadtteil, district, federal_state,
              avg_purchase_price_sqm, purchase_price_min, purchase_price_max,
              avg_rent_sqm, rent_min, rent_max,
              confidence_score, data_source, updated_at
       FROM plz_market_data
       WHERE ${whereClause}
       ORDER BY city ASC NULLS LAST
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Daten' });
  }
});

// Get single PLZ
router.get('/:plz', async (req, res) => {
  try {
    const data = await getMarketDataByPLZ(req.params.plz);
    if (!data) {
      return res.status(404).json({ error: 'PLZ nicht gefunden' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error fetching PLZ:', error);
    res.status(500).json({ error: 'Fehler beim Laden der PLZ' });
  }
});

// Trigger AI estimation
router.post('/estimate', async (req, res) => {
  try {
    const batchSize = Math.min(parseInt(req.body.batchSize) || 50, 100);
    const onlyWithoutPrices = req.body.onlyWithoutPrices !== false;

    // Get PLZ to estimate
    const plzList = onlyWithoutPrices
      ? await getPLZWithoutPrices(batchSize)
      : await getAllPLZForUpdate(batchSize);

    if (plzList.length === 0) {
      return res.json({
        success: true,
        estimated: 0,
        message: 'Keine PLZ zum Schätzen gefunden',
      });
    }

    // Estimate in batch
    const estimates = await estimateMarketDataBatch(plzList);

    // Update database
    const updated = await updateMarketDataInDB(estimates);

    // Save snapshot
    await saveMarketDataSnapshot(plzList.map((p) => p.plz));

    res.json({
      success: true,
      estimated: updated,
      message: `${updated} PLZ erfolgreich geschätzt`,
    });
  } catch (error) {
    console.error('Error estimating prices:', error);
    res.status(500).json({ error: 'Fehler beim Schätzen der Preise' });
  }
});

// Update single PLZ manually
router.put('/:plz', async (req, res) => {
  try {
    const { plz } = req.params;
    const updates = req.body;

    const setClauses: string[] = [];
    const params: any[] = [plz];
    let paramIndex = 2;

    const allowedFields = [
      'avg_purchase_price_sqm',
      'purchase_price_min',
      'purchase_price_max',
      'avg_rent_sqm',
      'rent_min',
      'rent_max',
    ];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Keine Felder zum Aktualisieren' });
    }

    setClauses.push(`data_source = 'manual'`);
    setClauses.push(`updated_at = NOW()`);

    await query(
      `UPDATE plz_market_data SET ${setClauses.join(', ')} WHERE plz = $1`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating PLZ:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der PLZ' });
  }
});

export default router;
