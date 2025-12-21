/**
 * Evaluations Router
 * Property AI evaluation and analysis
 */
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure, investorProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import { evaluatePropertyInvestment } from '../services/property-investment-evaluator.js';

export const evaluationsRouter = router({
  // Get evaluation for a property
  getByPropertyId: publicProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const evaluation = await queryOne(
        'SELECT * FROM property_evaluations WHERE property_id = $1',
        [input.propertyId]
      );

      return evaluation;
    }),

  // Get AI investment evaluation with detailed analysis
  getAIEvaluation: publicProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input }) => {
      const evaluation = await queryOne(
        'SELECT * FROM property_ai_evaluations WHERE property_id = $1',
        [input.propertyId]
      );

      return evaluation;
    }),

  // Create or update evaluation for a property
  createOrUpdate: protectedProcedure
    .input(
      z.object({
        propertyId: z.string().uuid(),
        investmentScore: z.number().min(0).max(100),
        analysisSummary: z.string().optional(),
        strengths: z.array(z.string()).optional(),
        weaknesses: z.array(z.string()).optional(),
        opportunities: z.array(z.string()).optional(),
        risks: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if property exists and user owns it
      const property = await queryOne(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized: Property not found or you do not own this property');
      }

      // Create or update evaluation
      const evaluation = await queryOne(
        `INSERT INTO property_evaluations (
          property_id, investment_score, analysis_summary,
          strengths, weaknesses, opportunities, risks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (property_id)
        DO UPDATE SET
          investment_score = EXCLUDED.investment_score,
          analysis_summary = EXCLUDED.analysis_summary,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          opportunities = EXCLUDED.opportunities,
          risks = EXCLUDED.risks,
          updated_at = NOW()
        RETURNING *`,
        [
          input.propertyId,
          input.investmentScore,
          input.analysisSummary || null,
          input.strengths || [],
          input.weaknesses || [],
          input.opportunities || [],
          input.risks || [],
        ]
      );

      // Also update the ai_score field in properties table
      await query(
        'UPDATE properties SET ai_score = $1 WHERE id = $2',
        [input.investmentScore, input.propertyId]
      );

      return evaluation;
    }),

  // Generate AI evaluation (mock for now - replace with real AI later)
  generateEvaluation: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Get property details
      const property = await queryOne(
        'SELECT * FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized: Property not found or you do not own this property');
      }

      // Mock AI evaluation based on property data
      const pricePerSqm = property.price / property.sqm;
      const avgPricePerSqm = 5000; // Mock average for the area

      let investmentScore = 70; // Base score

      // Adjust score based on price/sqm ratio
      if (pricePerSqm < avgPricePerSqm * 0.8) {
        investmentScore += 15; // Good value
      } else if (pricePerSqm > avgPricePerSqm * 1.2) {
        investmentScore -= 15; // Expensive
      }

      // Adjust based on property features
      if (property.features && property.features.length > 5) {
        investmentScore += 10;
      }

      // Cap score between 0-100
      investmentScore = Math.max(0, Math.min(100, investmentScore));

      const strengths = [];
      const weaknesses = [];
      const opportunities = [];
      const risks = [];

      if (pricePerSqm < avgPricePerSqm) {
        strengths.push('Attraktiver Preis pro Quadratmeter');
        opportunities.push('Potenzial für Wertsteigerung');
      } else {
        weaknesses.push('Höherer Preis im Vergleich zum Durchschnitt');
      }

      if (property.rooms >= 3) {
        strengths.push('Gute Raumaufteilung mit ${property.rooms} Zimmern');
      }

      if (property.sqm >= 80) {
        strengths.push('Großzügige Wohnfläche');
      } else {
        weaknesses.push('Begrenzte Wohnfläche');
      }

      if (property.yield && property.yield > 4) {
        strengths.push(`Hohe Rendite von ${property.yield}%`);
      }

      risks.push('Marktvolatilität und Zinsänderungen');
      opportunities.push('Wachsender Immobilienmarkt in der Region');

      const analysisSummary = `Diese Immobilie erhält einen Investment Score von ${investmentScore}/100. ` +
        `Der Preis von €${property.price.toLocaleString('de-DE')} für ${property.sqm}m² ` +
        `(€${Math.round(pricePerSqm).toLocaleString('de-DE')}/m²) ist ${pricePerSqm < avgPricePerSqm ? 'attraktiv' : 'im oberen Bereich'} ` +
        `für die Region ${property.location}.`;

      // Store evaluation
      const evaluation = await queryOne(
        `INSERT INTO property_evaluations (
          property_id, investment_score, analysis_summary,
          strengths, weaknesses, opportunities, risks
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (property_id)
        DO UPDATE SET
          investment_score = EXCLUDED.investment_score,
          analysis_summary = EXCLUDED.analysis_summary,
          strengths = EXCLUDED.strengths,
          weaknesses = EXCLUDED.weaknesses,
          opportunities = EXCLUDED.opportunities,
          risks = EXCLUDED.risks,
          updated_at = NOW()
        RETURNING *`,
        [
          input.propertyId,
          investmentScore,
          analysisSummary,
          strengths,
          weaknesses,
          opportunities,
          risks,
        ]
      );

      // Update ai_score in properties table
      await query(
        'UPDATE properties SET ai_score = $1 WHERE id = $2',
        [investmentScore, input.propertyId]
      );

      return evaluation;
    }),

  // Delete evaluation
  delete: protectedProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Check ownership
      const property = await queryOne(
        'SELECT user_id FROM properties WHERE id = $1',
        [input.propertyId]
      );

      if (!property || property.user_id !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      await query(
        'DELETE FROM property_evaluations WHERE property_id = $1',
        [input.propertyId]
      );

      // Reset ai_score
      await query(
        'UPDATE properties SET ai_score = NULL WHERE id = $1',
        [input.propertyId]
      );

      return { success: true };
    }),

  // Generate AI-powered investment evaluation (requires Investor+ plan)
  generateInvestmentEvaluation: investorProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      try {
        const result = await evaluatePropertyInvestment(input.propertyId);
        return {
          success: true,
          evaluation: result,
        };
      } catch (error) {
        console.error('Investment evaluation error:', error);
        throw new Error(
          error instanceof Error
            ? error.message
            : 'Failed to generate investment evaluation'
        );
      }
    }),
});
