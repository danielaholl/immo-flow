/**
 * User Property Parameters Router
 * Manages user-specific calculation parameters per property
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';

export const userPropertyParametersRouter = router({
  // Get parameters for a specific property
  get: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const params = await queryOne(
        `SELECT * FROM user_property_parameters
         WHERE user_id = $1 AND property_id = $2`,
        [ctx.user.id, input.propertyId]
      );

      return params || null;
    }),

  // Upsert (create or update) parameters
  upsert: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      equityPercentage: z.number().min(0).max(100).nullable().optional(),
      interestRate: z.number().min(0).max(20).nullable().optional(),
      amortizationRate: z.number().min(0).max(20).nullable().optional(),
      brokerCommission: z.number().min(0).max(20).nullable().optional(),
      monthlyRent: z.number().min(0).nullable().optional(),
      monthlyFee: z.number().min(0).nullable().optional(),
      purchasePrice: z.number().min(0).nullable().optional(),
      renovationCosts: z.number().min(0).nullable().optional(),
      // Berechnete Kennzahlen
      calculatedGrossYield: z.number().nullable().optional(),
      calculatedRentMultiplier: z.number().nullable().optional(),
      calculatedMonthlyCashflow: z.number().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const params = await queryOne(
        `INSERT INTO user_property_parameters
         (user_id, property_id, equity_percentage, interest_rate, amortization_rate, broker_commission, monthly_rent, monthly_fee, purchase_price, renovation_costs, calculated_gross_yield, calculated_rent_multiplier, calculated_monthly_cashflow)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (user_id, property_id)
         DO UPDATE SET
           equity_percentage = COALESCE($3, user_property_parameters.equity_percentage),
           interest_rate = COALESCE($4, user_property_parameters.interest_rate),
           amortization_rate = COALESCE($5, user_property_parameters.amortization_rate),
           broker_commission = COALESCE($6, user_property_parameters.broker_commission),
           monthly_rent = COALESCE($7, user_property_parameters.monthly_rent),
           monthly_fee = COALESCE($8, user_property_parameters.monthly_fee),
           purchase_price = COALESCE($9, user_property_parameters.purchase_price),
           renovation_costs = COALESCE($10, user_property_parameters.renovation_costs),
           calculated_gross_yield = COALESCE($11, user_property_parameters.calculated_gross_yield),
           calculated_rent_multiplier = COALESCE($12, user_property_parameters.calculated_rent_multiplier),
           calculated_monthly_cashflow = COALESCE($13, user_property_parameters.calculated_monthly_cashflow),
           -- Invalidate cached AI fazit when parameters change
           investor_fazit_text = NULL,
           investor_fazit_tips = NULL,
           investor_fazit_verdict = NULL,
           eigennutzer_fazit_text = NULL,
           eigennutzer_fazit_tips = NULL,
           eigennutzer_fazit_verdict = NULL,
           fazit_generated_at = NULL,
           updated_at = NOW()
         RETURNING *`,
        [
          ctx.user.id,
          input.propertyId,
          input.equityPercentage ?? null,
          input.interestRate ?? null,
          input.amortizationRate ?? null,
          input.brokerCommission ?? null,
          input.monthlyRent ?? null,
          input.monthlyFee ?? null,
          input.purchasePrice ?? null,
          input.renovationCosts ?? null,
          input.calculatedGrossYield ?? null,
          input.calculatedRentMultiplier ?? null,
          input.calculatedMonthlyCashflow ?? null,
        ]
      );

      return params;
    }),

  // Delete parameters for a property
  delete: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      await query(
        `DELETE FROM user_property_parameters
         WHERE user_id = $1 AND property_id = $2`,
        [ctx.user.id, input.propertyId]
      );

      return { success: true };
    }),
});
