/**
 * Tax Optimizer Router
 * Manages user tax profiles and provides calculation endpoints
 * for the Steuer-Optimierer feature (Reverse Tax Calculator)
 */
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import {
  calculateTargetPropertyPrice,
  calculatePropertyTaxEffect,
  calculateCashflowScenarios,
  AFA_STRATEGIES,
  DEFAULT_PARAMS,
  type AfaStrategy,
} from '../services/tax-calculator.js';

const afaStrategySchema = z.enum(['bestand', 'neubau', 'denkmal']);

export const taxOptimizerRouter = router({
  // Get the user's tax profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const profile = await queryOne(
      `SELECT * FROM tax_optimizer_profiles WHERE user_id = $1`,
      [ctx.user.id]
    );

    return profile || null;
  }),

  // Create or update the user's tax profile
  upsertProfile: protectedProcedure
    .input(
      z.object({
        annualTaxPaid: z.number().min(0).max(10000000),
        marginalTaxRate: z.number().min(0).max(0.5),
        ltvRatio: z.number().min(0).max(1.5).optional(),
        interestRate: z.number().min(0).max(0.15).optional(),
        rentalYield: z.number().min(0).max(0.15).optional(),
        maintenanceRate: z.number().min(0).max(0.05).optional(),
        preferredStrategy: afaStrategySchema.optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Calculate the target portfolio value
      const result = calculateTargetPropertyPrice({
        annualTaxPaid: input.annualTaxPaid,
        marginalTaxRate: input.marginalTaxRate,
        strategy: input.preferredStrategy || 'bestand',
        ltvRatio: input.ltvRatio,
        interestRate: input.interestRate,
        rentalYield: input.rentalYield,
        maintenanceRate: input.maintenanceRate,
      });

      const profile = await queryOne(
        `INSERT INTO tax_optimizer_profiles
         (user_id, annual_tax_paid, marginal_tax_rate, ltv_ratio, interest_rate, rental_yield, maintenance_rate, preferred_strategy, calculated_target_price, calculated_annual_savings, calculated_monthly_improvement, last_calculated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           annual_tax_paid = $2,
           marginal_tax_rate = $3,
           ltv_ratio = COALESCE($4, tax_optimizer_profiles.ltv_ratio),
           interest_rate = COALESCE($5, tax_optimizer_profiles.interest_rate),
           rental_yield = COALESCE($6, tax_optimizer_profiles.rental_yield),
           maintenance_rate = COALESCE($7, tax_optimizer_profiles.maintenance_rate),
           preferred_strategy = COALESCE($8, tax_optimizer_profiles.preferred_strategy),
           calculated_target_price = $9,
           calculated_annual_savings = $10,
           calculated_monthly_improvement = $11,
           last_calculated_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [
          ctx.user.id,
          input.annualTaxPaid,
          input.marginalTaxRate,
          input.ltvRatio ?? null,
          input.interestRate ?? null,
          input.rentalYield ?? null,
          input.maintenanceRate ?? null,
          input.preferredStrategy ?? null,
          result.targetPortfolioValue,
          result.annualTaxSavings,
          result.monthlyTaxSavings,
        ]
      );

      return {
        profile,
        calculation: result,
      };
    }),

  // Calculate target portfolio (stateless - doesn't save)
  // Can be used by non-logged-in users or for preview
  calculate: publicProcedure
    .input(
      z.object({
        annualTaxPaid: z.number().min(0).max(10000000),
        marginalTaxRate: z.number().min(0.1).max(0.5),
        strategy: afaStrategySchema,
        ltvRatio: z.number().min(0).max(1.5).optional(),
        interestRate: z.number().min(0).max(0.15).optional(),
        rentalYield: z.number().min(0).max(0.15).optional(),
        maintenanceRate: z.number().min(0).max(0.05).optional(),
        customAfaRate: z.number().min(0).max(0.2).optional(), // 0-20% benutzerdefinierter AfA-Satz
      })
    )
    .query(({ input }) => {
      return calculateTargetPropertyPrice({
        annualTaxPaid: input.annualTaxPaid,
        marginalTaxRate: input.marginalTaxRate,
        strategy: input.strategy,
        ltvRatio: input.ltvRatio,
        interestRate: input.interestRate,
        rentalYield: input.rentalYield,
        maintenanceRate: input.maintenanceRate,
        customAfaRate: input.customAfaRate,
      });
    }),

  // Calculate tax effect for a specific property
  calculatePropertyEffect: publicProcedure
    .input(
      z.object({
        propertyPrice: z.number().min(0),
        strategy: afaStrategySchema,
        marginalTaxRate: z.number().min(0.1).max(0.5).optional(),
        annualTaxPaid: z.number().min(0).optional(),
        ltvRatio: z.number().min(0).max(1.5).optional(),
        interestRate: z.number().min(0).max(0.15).optional(),
        rentalYield: z.number().min(0).max(0.15).optional(),
        maintenanceRate: z.number().min(0).max(0.05).optional(),
      })
    )
    .query(({ input }) => {
      return calculatePropertyTaxEffect(input.propertyPrice, {
        strategy: input.strategy,
        marginalTaxRate: input.marginalTaxRate ?? DEFAULT_PARAMS.marginalTaxRate,
        annualTaxPaid: input.annualTaxPaid,
        ltvRatio: input.ltvRatio,
        interestRate: input.interestRate,
        rentalYield: input.rentalYield,
        maintenanceRate: input.maintenanceRate,
      });
    }),

  // Get matching properties from database
  getMatchingProperties: publicProcedure
    .input(
      z.object({
        targetPrice: z.number().min(0),
        tolerance: z.number().min(0.1).max(0.5).default(0.2), // +/- 20%
        limit: z.number().min(1).max(10).default(3),
      })
    )
    .query(async ({ input }) => {
      const targetPrice = Math.round(input.targetPrice);
      const minPrice = Math.round(targetPrice * (1 - input.tolerance));
      const maxPrice = Math.round(targetPrice * (1 + input.tolerance));

      const properties = await query(
        `SELECT
           p.id,
           p.title,
           p.price,
           p.location,
           p.sqm,
           p.rooms,
           p.images,
           p.ai_investment_score,
           p.year_built,
           p.property_type,
           ABS(p.price - $1) as price_difference
         FROM properties p
         WHERE
           p.status = 'active'
           AND p.price BETWEEN $2 AND $3
           AND (p.is_external = false OR p.is_community_shared = true)
         ORDER BY
           price_difference ASC,
           p.ai_investment_score DESC NULLS LAST
         LIMIT $4`,
        [targetPrice, minPrice, maxPrice, input.limit]
      );

      return properties;
    }),

  // Get cashflow improvement scenarios
  getCashflowScenarios: publicProcedure
    .input(
      z.object({
        annualTaxPaid: z.number().min(0).max(10000000),
        marginalTaxRate: z.number().min(0.1).max(0.5),
        strategy: afaStrategySchema,
        ltvRatio: z.number().min(0).max(1.5).optional(),
        interestRate: z.number().min(0).max(0.15).optional(),
        rentalYield: z.number().min(0).max(0.15).optional(),
        maintenanceRate: z.number().min(0).max(0.05).optional(),
      })
    )
    .query(({ input }) => {
      // Calculate target first
      const result = calculateTargetPropertyPrice({
        annualTaxPaid: input.annualTaxPaid,
        marginalTaxRate: input.marginalTaxRate,
        strategy: input.strategy,
        ltvRatio: input.ltvRatio,
        interestRate: input.interestRate,
        rentalYield: input.rentalYield,
        maintenanceRate: input.maintenanceRate,
      });

      // Generate scenarios at 25%, 50%, 75%, 100% of target
      const targetValue = result.targetPortfolioValue;
      const scenarioValues = [
        Math.round(targetValue * 0.25),
        Math.round(targetValue * 0.5),
        Math.round(targetValue * 0.75),
        targetValue,
      ];

      const scenarios = calculateCashflowScenarios(
        {
          annualTaxPaid: input.annualTaxPaid,
          marginalTaxRate: input.marginalTaxRate,
          strategy: input.strategy,
          ltvRatio: input.ltvRatio,
          interestRate: input.interestRate,
          rentalYield: input.rentalYield,
          maintenanceRate: input.maintenanceRate,
        },
        scenarioValues
      );

      return {
        targetResult: result,
        scenarios,
      };
    }),

  // Get available strategies with their details
  getStrategies: publicProcedure.query(() => {
    return Object.entries(AFA_STRATEGIES).map(([key, value]) => ({
      id: key as AfaStrategy,
      ...value,
    }));
  }),

  // Get default parameters
  getDefaults: publicProcedure.query(() => {
    return DEFAULT_PARAMS;
  }),
});
