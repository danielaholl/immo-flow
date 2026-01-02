/**
 * Bookings/Subscriptions REST Routes
 * Express routes for admin UI to view subscription statistics and MRR
 */
import { Router } from 'express';
import { query } from '../db.js';

const router: ReturnType<typeof Router> = Router();

// Plan prices in EUR
const PLAN_PRICES: Record<string, number> = {
  investor: 29,
  pro: 79,
  sucher: 9,
  makler_pro: 99,
  makler_enterprise: 249,
};

// Get subscription statistics and MRR
router.get('/stats', async (req, res) => {
  try {
    // Get active subscriptions count by plan
    const planStats = await query(`
      SELECT
        plan_type,
        COUNT(*)::int as count
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
        AND (current_period_end IS NULL OR current_period_end > NOW())
      GROUP BY plan_type
    `);

    // Calculate MRR and totals
    let totalMRR = 0;
    let totalActive = 0;
    const byPlan: Record<string, { count: number; revenue: number }> = {};

    for (const row of planStats) {
      const price = PLAN_PRICES[row.plan_type] || 0;
      const revenue = row.count * price;
      totalMRR += revenue;
      totalActive += row.count;
      byPlan[row.plan_type] = {
        count: row.count,
        revenue,
      };
    }

    res.json({
      totalMRR,
      totalActive,
      byPlan,
    });
  } catch (error) {
    console.error('Error fetching booking stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// Get MRR history for the last 6 months
router.get('/history', async (req, res) => {
  try {
    // Get subscriptions created per month for the last 6 months
    const history = await query(`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', NOW() - INTERVAL '5 months'),
          date_trunc('month', NOW()),
          '1 month'::interval
        ) as month
      ),
      monthly_subs AS (
        SELECT
          date_trunc('month', created_at) as month,
          plan_type,
          COUNT(*)::int as count
        FROM subscriptions
        WHERE status IN ('active', 'trialing')
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY date_trunc('month', created_at), plan_type
      )
      SELECT
        m.month,
        COALESCE(SUM(
          ms.count * CASE ms.plan_type
            WHEN 'investor' THEN 29
            WHEN 'pro' THEN 79
            WHEN 'sucher' THEN 9
            WHEN 'makler_pro' THEN 99
            WHEN 'makler_enterprise' THEN 249
            ELSE 0
          END
        ), 0)::int as mrr
      FROM months m
      LEFT JOIN monthly_subs ms ON m.month = ms.month
      GROUP BY m.month
      ORDER BY m.month ASC
    `);

    res.json(
      history.map((row: { month: string; mrr: number }) => ({
        month: row.month,
        mrr: row.mrr,
      }))
    );
  } catch (error) {
    console.error('Error fetching booking history:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Verlaufs' });
  }
});

// List all subscriptions with pagination
router.get('/list', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const offset = (page - 1) * pageSize;
    const statusFilter = req.query.status as string;

    let whereClause = '1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (statusFilter) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(statusFilter);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM subscriptions s
       WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // Get data with user info
    params.push(pageSize, offset);
    const data = await query(
      `SELECT
        s.id,
        s.plan_type,
        s.status,
        s.current_period_start,
        s.current_period_end,
        s.created_at,
        s.cancel_at_period_end,
        u.email
       FROM subscriptions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    // Add price to each subscription
    const dataWithPrice = data.map((row: any) => ({
      ...row,
      price: PLAN_PRICES[row.plan_type] || 0,
    }));

    res.json({
      data: dataWithPrice,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Abonnements' });
  }
});

export default router;
