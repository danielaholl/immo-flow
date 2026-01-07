/**
 * Portfolio Router
 * Manages investor portfolio properties (manually added external properties)
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import {
  calculatePortfolioPropertyTax,
  type PortfolioPropertyTaxResult,
} from '../services/tax-calculator.js';
import { generateAIScoreAnalysis } from '../utils/claude.js';

// Input schema for creating/updating portfolio properties
const portfolioPropertySchema = z.object({
  // Basic Info
  title: z.string().min(1).max(200),
  propertyType: z.enum([
    'apartment', 'house', 'villa', 'multi_family',
    'land',
    'commercial', 'office', 'retail', 'industrial',
    'parking'
  ]).optional(),
  location: z.string().min(1).max(200),
  postalCode: z.string().max(20).optional(),
  streetAddress: z.string().max(200).optional(),

  // Physical Characteristics
  sqm: z.number().positive(),
  rooms: z.number().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(2030).optional(),
  condition: z.enum(['new', 'renovated', 'good', 'needs_work']).optional(),

  // Purchase Information
  purchaseDate: z.string().optional(), // ISO date string
  purchasePrice: z.number().positive(),
  purchaseCosts: z.number().min(0).optional(),
  renovationCosts: z.number().min(0).optional(),

  // Current Valuation
  currentValue: z.number().nonnegative().optional(),

  // Financing Details
  loanAmount: z.number().min(0).optional(),
  interestRate: z.number().min(0).max(20).optional(),
  amortizationRate: z.number().min(0).max(20).optional(),
  repaymentFreeYears: z.number().int().min(0).max(10).optional(),
  loanStartDate: z.string().optional(),
  loanTermYears: z.number().int().min(1).max(50).optional(),
  fixedRateUntil: z.string().optional(),

  // Rental Income
  monthlyRent: z.number().min(0).optional(),
  monthlyFee: z.number().min(0).optional(),
  vacancyRate: z.number().min(0).max(100).optional(),

  // Metadata
  notes: z.string().optional(),
  status: z.enum(['active', 'sold', 'archived']).optional(),

  // AI Score
  aiScore: z.number().int().min(0).max(100).optional(),
});

// Helper to calculate annual appreciation rate
// Formula: ((currentValue / purchasePrice) ^ (1/years)) - 1
// Returns percentage (e.g., 2.5 for 2.5%)
function calculateAppreciationRate(purchasePrice: number, currentValue: number, purchaseDate: string | null): number {
  const DEFAULT_RATE = 1.0; // 1% default if no data

  if (!purchasePrice || purchasePrice <= 0) return DEFAULT_RATE;
  if (!currentValue || currentValue <= 0) return DEFAULT_RATE;
  if (!purchaseDate) return DEFAULT_RATE;

  const purchase = new Date(purchaseDate);
  const now = new Date();
  const yearsDiff = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (yearsDiff < 0.5) return DEFAULT_RATE; // Less than 6 months, use default

  // Calculate CAGR (Compound Annual Growth Rate)
  const ratio = currentValue / purchasePrice;
  const annualRate = (Math.pow(ratio, 1 / yearsDiff) - 1) * 100;

  // Clamp to reasonable range (-10% to +20%)
  return Math.max(-10, Math.min(20, Math.round(annualRate * 100) / 100));
}

// Helper to calculate metrics for a portfolio property
function calculateMetrics(property: any) {
  const purchasePrice = Number(property.purchase_price) || 0;
  const currentValue = Number(property.current_value) || purchasePrice;
  const monthlyRent = Number(property.monthly_rent) || 0;
  const monthlyFee = Number(property.monthly_fee) || 0;
  const loanAmount = Number(property.loan_amount) || 0;
  const interestRate = Number(property.interest_rate) || 0;
  const amortizationRate = Number(property.amortization_rate) || 0;
  const repaymentFreeYears = Number(property.repayment_free_years) || 0;
  const loanStartDate = property.loan_start_date;
  const purchaseCosts = Number(property.purchase_costs) || 0;

  // Total investment
  const totalInvestment = purchasePrice + purchaseCosts + (Number(property.renovation_costs) || 0);

  // Check if we're still in the repayment-free period
  let isInRepaymentFreePeriod = false;
  if (repaymentFreeYears > 0 && loanStartDate) {
    const loanStart = new Date(loanStartDate);
    const repaymentFreeEnd = new Date(loanStart);
    repaymentFreeEnd.setFullYear(repaymentFreeEnd.getFullYear() + repaymentFreeYears);
    isInRepaymentFreePeriod = new Date() < repaymentFreeEnd;
  }

  // Loan payment calculation (no amortization during repayment-free period)
  const monthlyInterest = loanAmount * (interestRate / 100 / 12);
  const monthlyAmortization = isInRepaymentFreePeriod ? 0 : loanAmount * (amortizationRate / 100 / 12);
  const monthlyLoanPayment = monthlyInterest + monthlyAmortization;

  // Cashflow
  const monthlyCashflow = monthlyRent - monthlyFee - monthlyLoanPayment;
  const annualCashflow = monthlyCashflow * 12;

  // Yields
  const annualRent = monthlyRent * 12;
  const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;

  // Equity (total investment minus loan = own capital invested)
  const equity = totalInvestment - loanAmount;

  // Cash-on-Cash Return
  const equityInvested = totalInvestment - loanAmount;
  const cashOnCash = equityInvested > 0 ? (annualCashflow / equityInvested) * 100 : 0;

  // Rent multiplier (Faktor)
  const rentMultiplier = annualRent > 0 ? purchasePrice / annualRent : 0;

  return {
    totalInvestment,
    currentValue,
    equity,
    monthlyLoanPayment: Math.round(monthlyLoanPayment),
    monthlyCashflow: Math.round(monthlyCashflow),
    annualCashflow: Math.round(annualCashflow),
    grossYield: Math.round(grossYield * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    rentMultiplier: Math.round(rentMultiplier * 10) / 10,
  };
}

export const portfolioRouter = router({
  // Create a new portfolio property
  create: protectedProcedure
    .input(portfolioPropertySchema)
    .mutation(async ({ input, ctx }) => {
      // Check property limit for non-pro users (max 3)
      const countResult = await queryOne(
        `SELECT COUNT(*) as count FROM portfolio_properties WHERE user_id = $1 AND status = 'active'`,
        [ctx.user.id]
      );

      // Get user's subscription
      const subscription = await queryOne(
        `SELECT plan_type FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
        [ctx.user.id]
      );

      const isPro = subscription?.plan_type === 'pro';
      const currentCount = parseInt(countResult?.count || '0', 10);

      if (!isPro && currentCount >= 3) {
        throw new Error('PROPERTY_LIMIT_REACHED');
      }

      // Calculate appreciation rate for this property
      const appreciationRate = calculateAppreciationRate(
        input.purchasePrice,
        input.currentValue || input.purchasePrice,
        input.purchaseDate || null
      );

      const property = await queryOne(
        `INSERT INTO portfolio_properties (
          user_id, title, property_type, location, postal_code, street_address,
          sqm, rooms, year_built, condition,
          purchase_date, purchase_price, purchase_costs, renovation_costs,
          current_value, appreciation_rate_pa,
          loan_amount, interest_rate, amortization_rate, repayment_free_years, loan_start_date, loan_term_years, fixed_rate_until,
          monthly_rent, monthly_fee, vacancy_rate,
          notes, status, ai_score
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16,
          $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26,
          $27, $28, $29
        ) RETURNING *`,
        [
          ctx.user.id,
          input.title,
          input.propertyType || null,
          input.location,
          input.postalCode || null,
          input.streetAddress || null,
          input.sqm,
          input.rooms || null,
          input.yearBuilt || null,
          input.condition || null,
          input.purchaseDate || null,
          input.purchasePrice,
          input.purchaseCosts || null,
          input.renovationCosts || null,
          input.currentValue || input.purchasePrice,
          appreciationRate,
          input.loanAmount || null,
          input.interestRate || null,
          input.amortizationRate || null,
          input.repaymentFreeYears || 0,
          input.loanStartDate || null,
          input.loanTermYears || null,
          input.fixedRateUntil || null,
          input.monthlyRent || null,
          input.monthlyFee || null,
          input.vacancyRate || null,
          input.notes || null,
          input.status || 'active',
          input.aiScore || null,
        ]
      );

      // Generate historical value entries from purchase date to now
      const purchaseDate = input.purchaseDate ? new Date(input.purchaseDate) : new Date();
      const now = new Date();
      const currentValue = input.currentValue || input.purchasePrice;
      const purchasePrice = input.purchasePrice;
      const loanAmount = input.loanAmount || 0;
      const monthlyRent = input.monthlyRent || 0;
      const interestRate = input.interestRate || 0;
      const amortizationRate = input.amortizationRate || 0;

      // Calculate months between purchase and now
      const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
                         (now.getMonth() - purchaseDate.getMonth());

      // Generate monthly entries
      for (let i = 0; i <= monthsDiff; i++) {
        const entryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + i, 1);

        // Linear interpolation of property value from purchase price to current value
        const progress = monthsDiff > 0 ? i / monthsDiff : 1;
        const interpolatedValue = purchasePrice + (currentValue - purchasePrice) * progress;

        // Calculate remaining loan (simple amortization over time)
        const monthlyAmortization = loanAmount * (amortizationRate / 100 / 12);
        const remainingLoan = Math.max(0, loanAmount - (monthlyAmortization * i));

        await query(
          `INSERT INTO portfolio_value_history (portfolio_property_id, property_value, monthly_rent, remaining_loan, source, recorded_at)
           VALUES ($1, $2, $3, $4, 'manual', $5)`,
          [
            property.id,
            Math.round(interpolatedValue),
            monthlyRent,
            Math.round(remainingLoan),
            entryDate.toISOString(),
          ]
        );
      }

      return {
        ...property,
        metrics: calculateMetrics(property),
      };
    }),

  // Get all portfolio properties for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const properties = await query(
      `SELECT * FROM portfolio_properties
       WHERE user_id = $1 AND status != 'archived'
       ORDER BY created_at DESC`,
      [ctx.user.id]
    );

    return properties.map((p: any) => ({
      ...p,
      metrics: calculateMetrics(p),
    }));
  }),

  // Get a single portfolio property by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const property = await queryOne(
        `SELECT * FROM portfolio_properties
         WHERE id = $1 AND user_id = $2`,
        [input.id, ctx.user.id]
      );

      if (!property) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      return {
        ...property,
        metrics: calculateMetrics(property),
      };
    }),

  // Update a portfolio property
  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      data: portfolioPropertySchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      const fieldMapping: Record<string, string> = {
        title: 'title',
        propertyType: 'property_type',
        location: 'location',
        postalCode: 'postal_code',
        streetAddress: 'street_address',
        sqm: 'sqm',
        rooms: 'rooms',
        yearBuilt: 'year_built',
        condition: 'condition',
        purchaseDate: 'purchase_date',
        purchasePrice: 'purchase_price',
        purchaseCosts: 'purchase_costs',
        renovationCosts: 'renovation_costs',
        currentValue: 'current_value',
        loanAmount: 'loan_amount',
        interestRate: 'interest_rate',
        amortizationRate: 'amortization_rate',
        repaymentFreeYears: 'repayment_free_years',
        loanStartDate: 'loan_start_date',
        loanTermYears: 'loan_term_years',
        fixedRateUntil: 'fixed_rate_until',
        monthlyRent: 'monthly_rent',
        monthlyFee: 'monthly_fee',
        vacancyRate: 'vacancy_rate',
        notes: 'notes',
        status: 'status',
        aiScore: 'ai_score',
      };

      for (const [key, dbField] of Object.entries(fieldMapping)) {
        if (input.data[key as keyof typeof input.data] !== undefined) {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(input.data[key as keyof typeof input.data]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        throw new Error('NO_UPDATES_PROVIDED');
      }

      updates.push(`updated_at = NOW()`);

      values.push(input.id);
      values.push(ctx.user.id);

      const property = await queryOne(
        `UPDATE portfolio_properties
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (!property) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      // Recalculate and update appreciation rate
      const newAppreciationRate = calculateAppreciationRate(
        Number(property.purchase_price),
        Number(property.current_value),
        property.purchase_date
      );

      await query(
        `UPDATE portfolio_properties SET appreciation_rate_pa = $1 WHERE id = $2`,
        [newAppreciationRate, input.id]
      );
      property.appreciation_rate_pa = newAppreciationRate;

      // Record value history if current_value changed
      if (input.data.currentValue !== undefined) {
        await query(
          `INSERT INTO portfolio_value_history (portfolio_property_id, property_value, monthly_rent, remaining_loan, source)
           VALUES ($1, $2, $3, $4, 'manual')`,
          [
            property.id,
            input.data.currentValue,
            property.monthly_rent,
            property.loan_amount,
          ]
        );
      }

      return {
        ...property,
        metrics: calculateMetrics(property),
      };
    }),

  // Delete a portfolio property
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const result = await query(
        `DELETE FROM portfolio_properties
         WHERE id = $1 AND user_id = $2`,
        [input.id, ctx.user.id]
      );

      return { success: true };
    }),

  // Get portfolio summary with aggregated metrics
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const properties = await query(
      `SELECT * FROM portfolio_properties
       WHERE user_id = $1 AND status = 'active'`,
      [ctx.user.id]
    );

    if (properties.length === 0) {
      return {
        totalProperties: 0,
        totalValue: 0,
        totalEquity: 0,
        totalMonthlyCashflow: 0,
        totalAnnualCashflow: 0,
        averageYield: 0,
        averageCashOnCash: 0,
        averageAiScore: null,
      };
    }

    let totalValue = 0;
    let totalEquity = 0;
    let totalMonthlyCashflow = 0;
    let totalMonthlyRent = 0;
    let totalMonthlyDebtService = 0;
    let totalInvestment = 0;
    let weightedYieldSum = 0;
    let weightedCoCSum = 0;
    let weightedAppreciationSum = 0;
    let totalPurchasePrice = 0;
    let totalCurrentValue = 0;
    let aiScoreSum = 0;
    let aiScoreCount = 0;

    for (const p of properties) {
      const metrics = calculateMetrics(p);
      const purchasePrice = Number(p.purchase_price) || 0;
      const currentValue = Number(p.current_value) || purchasePrice;
      const appreciationRate = Number(p.appreciation_rate_pa) || 1.0;
      const monthlyRent = Number(p.monthly_rent) || 0;

      totalValue += metrics.currentValue;
      totalEquity += metrics.equity;
      totalMonthlyCashflow += metrics.monthlyCashflow;
      totalMonthlyRent += monthlyRent;
      totalMonthlyDebtService += metrics.monthlyLoanPayment;
      totalInvestment += metrics.totalInvestment;
      weightedYieldSum += metrics.grossYield * purchasePrice;
      weightedCoCSum += metrics.cashOnCash * purchasePrice;
      // Weight appreciation by current value (larger properties have more impact)
      weightedAppreciationSum += appreciationRate * currentValue;
      totalPurchasePrice += purchasePrice;
      totalCurrentValue += currentValue;

      // AI Score
      const aiScore = p.ai_score != null ? Number(p.ai_score) : null;
      if (aiScore != null) {
        aiScoreSum += aiScore;
        aiScoreCount++;
      }
    }

    const averageYield = totalPurchasePrice > 0
      ? Math.round((weightedYieldSum / totalPurchasePrice) * 100) / 100
      : 0;

    const averageCashOnCash = totalPurchasePrice > 0
      ? Math.round((weightedCoCSum / totalPurchasePrice) * 100) / 100
      : 0;

    // Weighted average appreciation rate (by current value)
    const averageAppreciationRate = totalCurrentValue > 0
      ? Math.round((weightedAppreciationSum / totalCurrentValue) * 100) / 100
      : 1.0;

    // Average AI Score
    const averageAiScore = aiScoreCount > 0
      ? Math.round(aiScoreSum / aiScoreCount)
      : null;

    return {
      totalProperties: properties.length,
      totalValue: Math.round(totalValue),
      totalEquity: Math.round(totalEquity),
      totalInvestment: Math.round(totalInvestment),
      totalMonthlyCashflow: Math.round(totalMonthlyCashflow),
      totalAnnualCashflow: Math.round(totalMonthlyCashflow * 12),
      totalMonthlyRent: Math.round(totalMonthlyRent),
      totalMonthlyDebtService: Math.round(totalMonthlyDebtService),
      averageYield,
      averageCashOnCash,
      averageAppreciationRate,
      averageAiScore,
    };
  }),

  // Get value history for a property (Pro feature)
  getValueHistory: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      period: z.enum(['3m', '6m', '1y', 'all']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne(
        `SELECT id FROM portfolio_properties WHERE id = $1 AND user_id = $2`,
        [input.propertyId, ctx.user.id]
      );

      if (!property) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      let dateFilter = '';
      if (input.period && input.period !== 'all') {
        const months = input.period === '3m' ? 3 : input.period === '6m' ? 6 : 12;
        dateFilter = `AND recorded_at >= NOW() - INTERVAL '${months} months'`;
      }

      const history = await query(
        `SELECT * FROM portfolio_value_history
         WHERE portfolio_property_id = $1 ${dateFilter}
         ORDER BY recorded_at ASC`,
        [input.propertyId]
      );

      return history;
    }),

  // Get portfolio performance history (aggregated, Pro feature)
  getPerformanceHistory: protectedProcedure
    .input(z.object({
      period: z.enum(['3m', '6m', '1y', 'all']).optional(),
    }))
    .query(async ({ ctx, input }) => {
      let dateFilter = '';
      if (input.period && input.period !== 'all') {
        const months = input.period === '3m' ? 3 : input.period === '6m' ? 6 : 12;
        dateFilter = `AND h.recorded_at >= NOW() - INTERVAL '${months} months'`;
      }

      // Use DISTINCT ON to get only the latest entry per property per month
      // This prevents duplicate entries from inflating the totals
      const history = await query(
        `WITH monthly_latest AS (
          SELECT DISTINCT ON (h.portfolio_property_id, DATE_TRUNC('month', h.recorded_at))
            h.portfolio_property_id,
            DATE_TRUNC('month', h.recorded_at) as month,
            h.property_value,
            h.remaining_loan,
            h.monthly_rent,
            h.recorded_at
          FROM portfolio_value_history h
          JOIN portfolio_properties p ON p.id = h.portfolio_property_id
          WHERE p.user_id = $1 ${dateFilter}
          ORDER BY h.portfolio_property_id, DATE_TRUNC('month', h.recorded_at), h.recorded_at DESC
        )
        SELECT
          month,
          SUM(property_value) as total_value,
          SUM(property_value - COALESCE(remaining_loan, 0)) as total_equity,
          SUM(monthly_rent) as total_rent
        FROM monthly_latest
        GROUP BY month
        ORDER BY month ASC`,
        [ctx.user.id]
      );

      return history;
    }),

  // Record a new value snapshot for a property
  recordValueSnapshot: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid(),
      value: z.number().positive(),
      rent: z.number().min(0).optional(),
      remainingLoan: z.number().min(0).optional(),
      source: z.enum(['manual', 'ai_estimate', 'appraisal']).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const property = await queryOne(
        `SELECT id, monthly_rent, loan_amount FROM portfolio_properties WHERE id = $1 AND user_id = $2`,
        [input.propertyId, ctx.user.id]
      );

      if (!property) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      // Insert history record
      const snapshot = await queryOne(
        `INSERT INTO portfolio_value_history (portfolio_property_id, property_value, monthly_rent, remaining_loan, source)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          input.propertyId,
          input.value,
          input.rent ?? property.monthly_rent,
          input.remainingLoan ?? property.loan_amount,
          input.source || 'manual',
        ]
      );

      // Update current value on property
      await query(
        `UPDATE portfolio_properties
         SET current_value = $1, value_updated_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [input.value, input.propertyId]
      );

      return snapshot;
    }),

  // Get property count (for limit checking)
  getPropertyCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await queryOne(
      `SELECT COUNT(*) as count FROM portfolio_properties WHERE user_id = $1 AND status = 'active'`,
      [ctx.user.id]
    );

    // Get user's subscription
    const subscription = await queryOne(
      `SELECT plan_type FROM subscriptions WHERE user_id = $1 AND status = 'active'`,
      [ctx.user.id]
    );

    const isPro = subscription?.plan_type === 'pro';

    return {
      count: parseInt(result?.count || '0', 10),
      limit: isPro ? null : 3,
      isPro,
    };
  }),

  // Regenerate history for a property (from purchase date to now)
  regenerateHistory: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get the property
      const property = await queryOne(
        `SELECT * FROM portfolio_properties WHERE id = $1 AND user_id = $2`,
        [input.propertyId, ctx.user.id]
      );

      if (!property) {
        throw new Error('PROPERTY_NOT_FOUND');
      }

      // Delete existing history entries
      await query(
        `DELETE FROM portfolio_value_history WHERE portfolio_property_id = $1`,
        [input.propertyId]
      );

      // Generate new history entries from purchase date to now
      const purchaseDate = property.purchase_date ? new Date(property.purchase_date) : new Date();
      const now = new Date();
      const currentValue = Number(property.current_value) || Number(property.purchase_price);
      const purchasePrice = Number(property.purchase_price);
      const loanAmount = Number(property.loan_amount) || 0;
      const monthlyRent = Number(property.monthly_rent) || 0;
      const amortizationRate = Number(property.amortization_rate) || 0;

      // Calculate months between purchase and now
      const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
                         (now.getMonth() - purchaseDate.getMonth());

      // Generate monthly entries
      for (let i = 0; i <= monthsDiff; i++) {
        const entryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + i, 1);

        // Linear interpolation of property value from purchase price to current value
        const progress = monthsDiff > 0 ? i / monthsDiff : 1;
        const interpolatedValue = purchasePrice + (currentValue - purchasePrice) * progress;

        // Calculate remaining loan (simple amortization over time)
        const monthlyAmortization = loanAmount * (amortizationRate / 100 / 12);
        const remainingLoan = Math.max(0, loanAmount - (monthlyAmortization * i));

        await query(
          `INSERT INTO portfolio_value_history (portfolio_property_id, property_value, monthly_rent, remaining_loan, source, recorded_at)
           VALUES ($1, $2, $3, $4, 'manual', $5)`,
          [
            input.propertyId,
            Math.round(interpolatedValue),
            monthlyRent,
            Math.round(remainingLoan),
            entryDate.toISOString(),
          ]
        );
      }

      return { success: true, monthsGenerated: monthsDiff + 1 };
    }),

  // Regenerate history for ALL user's properties
  regenerateAllHistory: protectedProcedure.mutation(async ({ ctx }) => {
    // Get all properties for the user
    const properties = await query(
      `SELECT * FROM portfolio_properties WHERE user_id = $1 AND status = 'active'`,
      [ctx.user.id]
    );

    let totalMonths = 0;

    for (const property of properties) {
      // Delete existing history entries
      await query(
        `DELETE FROM portfolio_value_history WHERE portfolio_property_id = $1`,
        [property.id]
      );

      // Generate new history entries from purchase date to now
      const purchaseDate = property.purchase_date ? new Date(property.purchase_date) : new Date();
      const now = new Date();
      const currentValue = Number(property.current_value) || Number(property.purchase_price);
      const purchasePrice = Number(property.purchase_price);
      const loanAmount = Number(property.loan_amount) || 0;
      const monthlyRent = Number(property.monthly_rent) || 0;
      const amortizationRate = Number(property.amortization_rate) || 0;

      // Calculate months between purchase and now
      const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 +
                         (now.getMonth() - purchaseDate.getMonth());

      // Generate monthly entries
      for (let i = 0; i <= monthsDiff; i++) {
        const entryDate = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth() + i, 1);

        // Linear interpolation of property value from purchase price to current value
        const progress = monthsDiff > 0 ? i / monthsDiff : 1;
        const interpolatedValue = purchasePrice + (currentValue - purchasePrice) * progress;

        // Calculate remaining loan (simple amortization over time)
        const monthlyAmortization = loanAmount * (amortizationRate / 100 / 12);
        const remainingLoan = Math.max(0, loanAmount - (monthlyAmortization * i));

        await query(
          `INSERT INTO portfolio_value_history (portfolio_property_id, property_value, monthly_rent, remaining_loan, source, recorded_at)
           VALUES ($1, $2, $3, $4, 'manual', $5)`,
          [
            property.id,
            Math.round(interpolatedValue),
            monthlyRent,
            Math.round(remainingLoan),
            entryDate.toISOString(),
          ]
        );
      }

      totalMonths += monthsDiff + 1;
    }

    return { success: true, propertiesProcessed: properties.length, totalMonthsGenerated: totalMonths };
  }),

  // Get tax effects for all portfolio properties
  getTaxEffects: protectedProcedure.query(async ({ ctx }) => {
    // Load user's tax profile for marginal tax rate
    const taxProfile = await queryOne(
      `SELECT marginal_tax_rate FROM tax_optimizer_profiles WHERE user_id = $1`,
      [ctx.user.id]
    );

    // Use 42% (Spitzensteuersatz) as default if no profile exists
    const DEFAULT_TAX_RATE = 0.42;
    const hasTaxProfile = !!taxProfile && Number(taxProfile.marginal_tax_rate) > 0;
    const marginalTaxRate = hasTaxProfile
      ? Number(taxProfile.marginal_tax_rate)
      : DEFAULT_TAX_RATE;

    // Load all active properties with required fields
    const properties = await query(
      `SELECT
        id, purchase_price, year_built, building_share,
        loan_amount, interest_rate, monthly_rent
       FROM portfolio_properties
       WHERE user_id = $1 AND status = 'active'`,
      [ctx.user.id]
    );

    // Calculate tax effect for each property
    const taxEffects: Record<string, PortfolioPropertyTaxResult> = {};
    let totalAnnualTaxEffect = 0;

    for (const p of properties) {
      const effect = calculatePortfolioPropertyTax({
        purchasePrice: Number(p.purchase_price) || 0,
        yearBuilt: p.year_built,
        buildingShare: Number(p.building_share) || 0.80,
        loanAmount: Number(p.loan_amount) || 0,
        interestRate: Number(p.interest_rate) || 0,
        monthlyRent: Number(p.monthly_rent) || 0,
        marginalTaxRate,
      });

      taxEffects[p.id] = effect;
      totalAnnualTaxEffect += effect.annualTaxEffect;
    }

    return {
      hasTaxProfile,
      marginalTaxRate,
      taxEffects,
      summary: {
        totalAnnualTaxEffect: Math.round(totalAnnualTaxEffect),
        totalMonthlyTaxEffect: Math.round(totalAnnualTaxEffect / 12),
        propertyCount: properties.length,
      },
    };
  }),

  // Calculate AI Score for a portfolio property
  calculateAiScore: protectedProcedure
    .input(z.object({
      propertyId: z.string().uuid().optional(),
      // Or provide property data directly (for new properties not yet saved)
      propertyData: z.object({
        purchasePrice: z.number().positive(),
        location: z.string().min(1),
        sqm: z.number().positive(),
        yearBuilt: z.number().int().min(1800).max(2030).optional(),
        monthlyRent: z.number().min(0).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let propertyData: {
        price: number;
        location: string;
        sqm: number;
        yearBuilt?: number;
        monthlyRent?: number;
        grossYield?: number;
      };

      // If propertyId provided, load from database
      if (input.propertyId) {
        const property = await queryOne(
          `SELECT purchase_price, location, sqm, year_built, monthly_rent
           FROM portfolio_properties WHERE id = $1 AND user_id = $2`,
          [input.propertyId, ctx.user.id]
        );

        if (!property) {
          throw new Error('PROPERTY_NOT_FOUND');
        }

        const purchasePrice = Number(property.purchase_price) || 0;
        const monthlyRent = Number(property.monthly_rent) || 0;
        const annualRent = monthlyRent * 12;
        const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : undefined;

        propertyData = {
          price: purchasePrice,
          location: property.location || '',
          sqm: Number(property.sqm) || 0,
          yearBuilt: property.year_built ? Number(property.year_built) : undefined,
          monthlyRent: monthlyRent > 0 ? monthlyRent : undefined,
          grossYield,
        };
      } else if (input.propertyData) {
        // Use provided property data
        const { purchasePrice, location, sqm, yearBuilt, monthlyRent } = input.propertyData;
        const annualRent = (monthlyRent || 0) * 12;
        const grossYield = purchasePrice > 0 && annualRent > 0
          ? (annualRent / purchasePrice) * 100
          : undefined;

        propertyData = {
          price: purchasePrice,
          location,
          sqm,
          yearBuilt,
          monthlyRent,
          grossYield,
        };
      } else {
        throw new Error('Either propertyId or propertyData must be provided');
      }

      // Generate AI analysis using Claude
      const analysis = await generateAIScoreAnalysis(propertyData);

      // Calculate overall score as weighted average of factors
      const weights = {
        location: 0.30,
        pricePerformance: 0.25,
        appreciation: 0.20,
        rentability: 0.25,
      };

      const overallScore = Math.round(
        analysis.factors.location * weights.location +
        analysis.factors.pricePerformance * weights.pricePerformance +
        analysis.factors.appreciation * weights.appreciation +
        analysis.factors.rentability * weights.rentability
      );

      // If propertyId provided, update the database
      if (input.propertyId) {
        await query(
          `UPDATE portfolio_properties SET ai_score = $1, updated_at = NOW() WHERE id = $2`,
          [overallScore, input.propertyId]
        );
      }

      return {
        overallScore,
        summary: analysis.summary,
        factors: analysis.factors,
      };
    }),
});
