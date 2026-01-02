/**
 * Interest Rates tRPC Router
 * For web app integration (Calculator defaults, charts)
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';
import {
  getCurrentInterestRate,
  getInterestRateHistory,
  getInterestRateMatrix,
} from '../services/interest-rate-extractor.js';

export const interestRatesRouter = router({
  /**
   * Get current interest rate (public - for calculator defaults)
   * Returns the current market interest rate based on financing parameters
   */
  getCurrent: publicProcedure
    .input(
      z
        .object({
          loanToValue: z.number().min(50).max(100).default(80),
          fixedRateYears: z.number().min(5).max(30).default(10),
          propertyValue: z.number().positive().default(250000),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const result = await getCurrentInterestRate(
        input?.loanToValue ?? 80,
        input?.fixedRateYears ?? 10,
        input?.propertyValue ?? 250000
      );

      return result;
    }),

  /**
   * Get rate history for charts (public)
   * Returns historical interest rates for trend visualization
   */
  getHistory: publicProcedure
    .input(
      z
        .object({
          weeks: z.number().min(4).max(52).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const weeks = input?.weeks || 10;
      const history = await getInterestRateHistory(weeks);
      return history;
    }),

  /**
   * Get full rate matrix (public)
   * Returns complete matrix of rates by LTV and fixed period
   */
  getMatrix: publicProcedure.query(async () => {
    const result = await getInterestRateMatrix();

    if (!result.update) {
      return null;
    }

    return {
      update: {
        calendarWeek: result.update.calendarWeek,
        year: result.update.year,
        topRate: result.update.topRate,
        uploadDate: result.update.uploadDate,
      },
      matrix: result.matrix,
      propertyValueAdjustments: result.propertyValueAdjustments,
    };
  }),

  /**
   * Get rate for specific property (public)
   * Calculates the appropriate rate based on property details
   */
  getRateForProperty: publicProcedure
    .input(
      z.object({
        purchasePrice: z.number().positive(),
        equityPercentage: z.number().min(0).max(100).default(20),
        fixedRateYears: z.number().min(5).max(30).default(10),
      })
    )
    .query(async ({ input }) => {
      // Calculate loan-to-value from equity percentage
      const loanToValue = 100 - input.equityPercentage;

      // Round to nearest standard LTV tier (50, 70, 80, 90, 100)
      const ltvTiers = [50, 70, 80, 90, 100];
      const closestLtv = ltvTiers.reduce((prev, curr) =>
        Math.abs(curr - loanToValue) < Math.abs(prev - loanToValue) ? curr : prev
      );

      const result = await getCurrentInterestRate(
        closestLtv,
        input.fixedRateYears,
        input.purchasePrice
      );

      return {
        interestRate: result?.interestRate ?? null,
        calculatedLtv: loanToValue,
        usedLtvTier: closestLtv,
        fixedRateYears: input.fixedRateYears,
        lastUpdated: result?.lastUpdated ?? null,
        calendarWeek: result?.calendarWeek ?? null,
        year: result?.year ?? null,
      };
    }),

  /**
   * Check if rate data is available (public)
   * Quick check to see if any rate data exists
   */
  hasData: publicProcedure.query(async () => {
    const result = await getCurrentInterestRate();
    return {
      hasData: result !== null,
      lastUpdated: result?.lastUpdated ?? null,
    };
  }),
});
