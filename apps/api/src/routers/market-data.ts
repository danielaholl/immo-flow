/**
 * Market Data Router
 * PLZ-based market data for property valuation
 */
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
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

export const marketDataRouter = router({
  // Get market data for a specific PLZ (public)
  getByPLZ: publicProcedure
    .input(z.object({ plz: z.string().length(5) }))
    .query(async ({ input }) => {
      const data = await getMarketDataByPLZ(input.plz);

      if (!data) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Keine Marktdaten für PLZ ${input.plz} gefunden`,
        });
      }

      return data;
    }),

  // Search PLZ by city name (public)
  searchByCity: publicProcedure
    .input(z.object({
      city: z.string().min(2),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const results = await query(
        `SELECT plz, city, district, federal_state,
                avg_purchase_price_sqm, avg_rent_sqm, confidence_score,
                grunderwerbsteuer_rate
         FROM plz_market_data
         WHERE city ILIKE $1 OR district ILIKE $1
         ORDER BY city, plz
         LIMIT $2`,
        [`%${input.city}%`, input.limit]
      );

      return results;
    }),

  // Get market data by federal state (public)
  getByState: publicProcedure
    .input(z.object({
      state: z.string(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const results = await query(
        `SELECT plz, city, district, federal_state,
                avg_purchase_price_sqm, avg_rent_sqm, confidence_score
         FROM plz_market_data
         WHERE federal_state ILIKE $1
         ORDER BY avg_purchase_price_sqm DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [`%${input.state}%`, input.limit, input.offset]
      );

      return results;
    }),

  // Get price history for a PLZ (public)
  getHistory: publicProcedure
    .input(z.object({
      plz: z.string().length(5),
      months: z.number().min(1).max(24).default(12),
    }))
    .query(async ({ input }) => {
      const history = await query(
        `SELECT plz, avg_purchase_price_sqm, avg_rent_sqm, snapshot_date
         FROM plz_market_data_history
         WHERE plz = $1
           AND snapshot_date >= CURRENT_DATE - INTERVAL '1 month' * $2
         ORDER BY snapshot_date DESC`,
        [input.plz, input.months]
      );

      return history;
    }),

  // ============= ADMIN ENDPOINTS =============

  // Get market data statistics (admin)
  getStats: protectedProcedure.query(async () => {
    const stats = await getMarketDataStats();

    // Get count by federal state
    const stateStats = await query(
      `SELECT federal_state, COUNT(*) as total,
              COUNT(avg_purchase_price_sqm) as with_prices
       FROM plz_market_data
       GROUP BY federal_state
       ORDER BY total DESC`
    );

    return {
      ...stats,
      byState: stateStats,
    };
  }),

  // List all PLZ with pagination (admin)
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(50),
      state: z.string().optional(),
      city: z.string().optional(),
      onlyWithoutPrices: z.boolean().default(false),
      sortBy: z.enum(['plz', 'city', 'price', 'updated']).default('city'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.pageSize;

      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (input.state) {
        whereClause += ` AND federal_state ILIKE $${paramIndex}`;
        params.push(`%${input.state}%`);
        paramIndex++;
      }

      if (input.city) {
        whereClause += ` AND (city ILIKE $${paramIndex} OR district ILIKE $${paramIndex})`;
        params.push(`%${input.city}%`);
        paramIndex++;
      }

      if (input.onlyWithoutPrices) {
        whereClause += ` AND avg_purchase_price_sqm IS NULL`;
      }

      const orderMap: Record<string, string> = {
        plz: 'plz',
        city: 'city',
        price: 'avg_purchase_price_sqm',
        updated: 'updated_at',
      };
      const orderColumn = orderMap[input.sortBy] || 'city';
      const orderDir = input.sortOrder.toUpperCase();

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*)::int as total FROM plz_market_data WHERE ${whereClause}`,
        params
      );
      const total = countResult[0]?.total || 0;

      // Get data
      params.push(input.pageSize, offset);
      const data = await query(
        `SELECT plz, city, district, federal_state,
                avg_purchase_price_sqm, purchase_price_min, purchase_price_max,
                avg_rent_sqm, rent_min, rent_max,
                confidence_score, data_source, updated_at
         FROM plz_market_data
         WHERE ${whereClause}
         ORDER BY ${orderColumn} ${orderDir} NULLS LAST
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        params
      );

      return {
        data,
        pagination: {
          page: input.page,
          pageSize: input.pageSize,
          total,
          totalPages: Math.ceil(total / input.pageSize),
        },
      };
    }),

  // Update a single PLZ manually (admin)
  update: protectedProcedure
    .input(z.object({
      plz: z.string().length(5),
      avg_purchase_price_sqm: z.number().positive().optional(),
      purchase_price_min: z.number().positive().optional(),
      purchase_price_max: z.number().positive().optional(),
      avg_rent_sqm: z.number().positive().optional(),
      rent_min: z.number().positive().optional(),
      rent_max: z.number().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      const { plz, ...updates } = input;

      const setClauses: string[] = [];
      const params: any[] = [plz];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Keine Felder zum Aktualisieren',
        });
      }

      setClauses.push(`data_source = 'manual'`);
      setClauses.push(`updated_at = NOW()`);

      await query(
        `UPDATE plz_market_data SET ${setClauses.join(', ')} WHERE plz = $1`,
        params
      );

      return { success: true };
    }),

  // Trigger AI estimation for PLZ without prices (admin)
  estimatePrices: protectedProcedure
    .input(z.object({
      batchSize: z.number().min(1).max(100).default(50),
      onlyWithoutPrices: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      // Get PLZ to estimate
      const plzList = input.onlyWithoutPrices
        ? await getPLZWithoutPrices(input.batchSize)
        : await getAllPLZForUpdate(input.batchSize);

      if (plzList.length === 0) {
        return {
          success: true,
          estimated: 0,
          message: 'Keine PLZ zum Schätzen gefunden',
        };
      }

      // Estimate in batch
      const estimates = await estimateMarketDataBatch(plzList);

      // Update database
      const updated = await updateMarketDataInDB(estimates);

      // Save snapshot
      await saveMarketDataSnapshot(plzList.map((p) => p.plz));

      return {
        success: true,
        estimated: updated,
        message: `${updated} PLZ erfolgreich geschätzt`,
      };
    }),

  // Import PLZ from OpenPLZ API (admin) - triggers the import script
  importPLZ: protectedProcedure.mutation(async () => {
    // Count current PLZ
    const beforeCount = await query('SELECT COUNT(*)::int as count FROM plz_market_data');
    const before = beforeCount[0]?.count || 0;

    // Note: This would typically trigger the import script
    // For now, we just return the current status
    return {
      success: true,
      message: 'PLZ-Import muss manuell über CLI ausgeführt werden: pnpm exec tsx packages/database/scripts/import-plz-data.ts',
      currentCount: before,
    };
  }),
});
