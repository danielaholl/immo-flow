/**
 * Properties REST Routes
 * Express routes for admin UI to list properties
 */
import { Router } from 'express';
import { query } from '../db.js';

const router: ReturnType<typeof Router> = Router();

// Get property statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
        COUNT(CASE WHEN status = 'sold' THEN 1 END)::int as sold,
        COUNT(CASE WHEN status = 'archived' THEN 1 END)::int as archived,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END)::int as inactive,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending
      FROM properties
      WHERE deleted_at IS NULL
    `);

    res.json({
      total: result[0]?.total || 0,
      active: result[0]?.active || 0,
      sold: result[0]?.sold || 0,
      archived: result[0]?.archived || 0,
      inactive: result[0]?.inactive || 0,
      pending: result[0]?.pending || 0,
    });
  } catch (error) {
    console.error('Error fetching property stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// List properties with pagination, search, and status filter
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const offset = (page - 1) * pageSize;
    const search = req.query.search as string;
    const status = req.query.status as string;

    let whereClause = 'p.deleted_at IS NULL';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (
        p.title ILIKE $${paramIndex} OR
        p.location ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM properties p
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get data with owner info
    params.push(pageSize, offset);
    const data = await query(
      `SELECT
        p.id,
        p.title,
        p.price,
        p.location,
        p.rooms,
        p.sqm,
        p.status,
        p.created_at,
        p.user_id,
        up.first_name as owner_first_name,
        up.last_name as owner_last_name
       FROM properties p
       LEFT JOIN user_profiles up ON p.user_id = up.user_id
       WHERE ${whereClause}
       ORDER BY p.created_at DESC
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
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Properties' });
  }
});

export default router;
