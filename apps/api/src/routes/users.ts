/**
 * Users REST Routes
 * Express routes for admin UI to list registered users
 */
import { Router } from 'express';
import { query } from '../db.js';

const router: ReturnType<typeof Router> = Router();

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int as new_this_week,
        COUNT(CASE WHEN u.created_at >= NOW() - INTERVAL '30 days' THEN 1 END)::int as new_this_month
      FROM users u
    `);

    res.json({
      totalUsers: result[0]?.total_users || 0,
      newThisWeek: result[0]?.new_this_week || 0,
      newThisMonth: result[0]?.new_this_month || 0,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// List users with pagination and search
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const offset = (page - 1) * pageSize;
    const search = req.query.search as string;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (
        u.email ILIKE $${paramIndex} OR
        p.first_name ILIKE $${paramIndex} OR
        p.last_name ILIKE $${paramIndex} OR
        p.company ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get data
    params.push(pageSize, offset);
    const data = await query(
      `SELECT
        u.id,
        u.email,
        p.first_name,
        p.last_name,
        p.phone,
        p.company,
        u.created_at,
        s.plan_type,
        s.status as subscription_status,
        s.current_period_end
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN subscriptions s ON u.id = s.user_id
       WHERE ${whereClause}
       ORDER BY u.created_at DESC
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
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Benutzer' });
  }
});

export default router;
