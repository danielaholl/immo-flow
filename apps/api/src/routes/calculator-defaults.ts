/**
 * Calculator Defaults REST Routes
 * Express routes for admin UI to manage global calculator defaults
 */
import { Router, Request, Response } from 'express';
import {
  getGlobalDefaults,
  updateGlobalDefaults,
  getDefaultsHistory,
  type CalculatorDefaults,
} from '../services/calculator-defaults-service.js';
import { query, queryOne } from '../db.js';

const router: ReturnType<typeof Router> = Router();

// =====================================================
// ADMIN ENDPOINTS
// =====================================================

/**
 * GET /api/calculator-defaults
 * Get current global defaults
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const defaults = await getGlobalDefaults();
    res.json(defaults);
  } catch (error) {
    console.error('Error fetching calculator defaults:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Standardwerte' });
  }
});

/**
 * PUT /api/calculator-defaults
 * Update global defaults (requires change reason)
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const {
      buildingRatioStandard,
      buildingRatioNeubau,
      maintenanceCostPerSqm,
      nonAllocableHausgeldRatio,
      costIncreaseRate,
      rentIncreaseRate,
      valueAppreciationRate,
      hausgeldPerSqmModern,
      hausgeldPerSqmOld,
      equityPercentage,
      amortizationRate,
      changedBy,
      changeReason,
    } = req.body;

    // Validation
    if (!changedBy || !changeReason) {
      return res.status(400).json({
        error: 'changedBy und changeReason sind erforderlich',
      });
    }

    // Validate ranges
    const validations = [
      { field: 'buildingRatioStandard', value: buildingRatioStandard, min: 0, max: 1 },
      { field: 'buildingRatioNeubau', value: buildingRatioNeubau, min: 0, max: 1 },
      { field: 'maintenanceCostPerSqm', value: maintenanceCostPerSqm, min: 0, max: 100 },
      { field: 'nonAllocableHausgeldRatio', value: nonAllocableHausgeldRatio, min: 0, max: 1 },
      { field: 'costIncreaseRate', value: costIncreaseRate, min: 0, max: 0.5 },
      { field: 'rentIncreaseRate', value: rentIncreaseRate, min: 0, max: 0.5 },
      { field: 'valueAppreciationRate', value: valueAppreciationRate, min: -0.2, max: 0.5 },
      { field: 'hausgeldPerSqmModern', value: hausgeldPerSqmModern, min: 0, max: 20 },
      { field: 'hausgeldPerSqmOld', value: hausgeldPerSqmOld, min: 0, max: 20 },
      { field: 'equityPercentage', value: equityPercentage, min: 0, max: 100 },
      { field: 'amortizationRate', value: amortizationRate, min: 0, max: 10 },
    ];

    for (const v of validations) {
      if (v.value !== undefined && v.value !== null) {
        if (typeof v.value !== 'number' || v.value < v.min || v.value > v.max) {
          return res.status(400).json({
            error: `${v.field} muss zwischen ${v.min} und ${v.max} liegen`,
          });
        }
      }
    }

    const updated = await updateGlobalDefaults(
      {
        buildingRatioStandard,
        buildingRatioNeubau,
        maintenanceCostPerSqm,
        nonAllocableHausgeldRatio,
        costIncreaseRate,
        rentIncreaseRate,
        valueAppreciationRate,
        hausgeldPerSqmModern,
        hausgeldPerSqmOld,
        equityPercentage,
        amortizationRate,
      },
      changedBy,
      changeReason
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating calculator defaults:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Standardwerte' });
  }
});

/**
 * GET /api/calculator-defaults/history
 * Get change history (paginated)
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const offset = (page - 1) * pageSize;

    const { history, total } = await getDefaultsHistory(pageSize, offset);

    res.json({
      history,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching defaults history:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Historie' });
  }
});

/**
 * GET /api/calculator-defaults/stats
 * Get statistics for admin dashboard
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const defaults = await getGlobalDefaults();
    const { total: historyCount } = await getDefaultsHistory(1, 0);

    // Count users with custom preferences
    const userPrefsCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_calculator_preferences`
    );

    res.json({
      currentDefaults: {
        buildingRatioStandard: `${(defaults.buildingRatioStandard * 100).toFixed(0)}%`,
        buildingRatioNeubau: `${(defaults.buildingRatioNeubau * 100).toFixed(0)}%`,
        maintenanceCostPerSqm: `${defaults.maintenanceCostPerSqm.toFixed(2)} €/m²/Jahr`,
        nonAllocableHausgeldRatio: `${(defaults.nonAllocableHausgeldRatio * 100).toFixed(0)}%`,
        costIncreaseRate: `${(defaults.costIncreaseRate * 100).toFixed(1)}%/Jahr`,
        rentIncreaseRate: `${(defaults.rentIncreaseRate * 100).toFixed(1)}%/Jahr`,
        valueAppreciationRate: `${(defaults.valueAppreciationRate * 100).toFixed(1)}%/Jahr`,
        hausgeldPerSqmModern: `${defaults.hausgeldPerSqmModern.toFixed(2)} €/m²`,
        hausgeldPerSqmOld: `${defaults.hausgeldPerSqmOld.toFixed(2)} €/m²`,
        equityPercentage: `${defaults.equityPercentage.toFixed(1)}%`,
        amortizationRate: `${defaults.amortizationRate.toFixed(2)}%`,
      },
      rawDefaults: defaults,
      historyCount,
      usersWithCustomPrefs: parseInt(userPrefsCount?.count || '0'),
      lastUpdated: defaults.updatedAt,
      lastChangedBy: defaults.changedBy,
    });
  } catch (error) {
    console.error('Error fetching calculator defaults stats:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Statistiken' });
  }
});

/**
 * GET /api/calculator-defaults/user-preferences
 * List all user preferences (admin view)
 */
router.get('/user-preferences', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 50, 100);
    const offset = (page - 1) * pageSize;

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT
           ucp.*,
           up.first_name,
           up.last_name,
           u.email
         FROM user_calculator_preferences ucp
         LEFT JOIN user_profiles up ON up.user_id = ucp.user_id
         LEFT JOIN users u ON u.id = ucp.user_id
         ORDER BY ucp.updated_at DESC
         LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM user_calculator_preferences`
      ),
    ]);

    const total = parseInt(countResult?.count || '0');

    res.json({
      preferences: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Benutzereinstellungen' });
  }
});

export default router;
