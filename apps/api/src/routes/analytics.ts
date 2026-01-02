/**
 * Analytics REST Routes
 * Express routes for admin UI to view user activity analytics
 */
import { Router } from 'express';
import { query } from '../db.js';

const router: ReturnType<typeof Router> = Router();

// Get user activity statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM users) as total_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '7 days' AND created_at < NOW() - INTERVAL '0 days') as this_week,
        (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') as last_week,
        (SELECT COUNT(DISTINCT s.user_id)::int FROM subscriptions s WHERE s.status IN ('active', 'trialing')) as active_subscribers
    `);

    const thisWeek = result[0]?.this_week || 0;
    const lastWeek = result[0]?.last_week || 0;
    const trendPercent = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    res.json({
      totalUsers: result[0]?.total_users || 0,
      newThisWeek: result[0]?.new_this_week || 0,
      newThisMonth: result[0]?.new_this_month || 0,
      activeSubscribers: result[0]?.active_subscribers || 0,
      weeklyTrend: trendPercent,
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
  }
});

// Get registration history (last 12 weeks)
router.get('/registrations', async (req, res) => {
  try {
    const result = await query(`
      WITH weeks AS (
        SELECT generate_series(
          date_trunc('week', NOW() - INTERVAL '11 weeks'),
          date_trunc('week', NOW()),
          '1 week'::interval
        ) as week_start
      )
      SELECT
        w.week_start,
        COUNT(u.id)::int as registrations
      FROM weeks w
      LEFT JOIN users u ON date_trunc('week', u.created_at) = w.week_start
      GROUP BY w.week_start
      ORDER BY w.week_start ASC
    `);

    res.json(
      result.map((row: { week_start: string; registrations: number }) => ({
        week: row.week_start,
        registrations: row.registrations,
      }))
    );
  } catch (error) {
    console.error('Error fetching registration history:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Verlaufs' });
  }
});

export default router;
