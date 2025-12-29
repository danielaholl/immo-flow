/**
 * Evaluations Router
 * Property AI evaluation and analysis
 */
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure, investorProcedure } from '../trpc.js';
import { query, queryOne } from '../db.js';
import { evaluatePropertyInvestment } from '../services/property-investment-evaluator.js';
import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';
import { generateClaudeFazit, generateAIScoreAnalysis, AIScoreAnalysisInput } from '../utils/claude.js';

export const evaluationsRouter = router({
  // Calculate AI Score for manual input (no property required)
  calculateManualAIScore: publicProcedure
    .input(z.object({
      price: z.number().positive(),
      location: z.string().min(1),
      sqm: z.number().positive(),
      yearBuilt: z.number().optional(),
      monthlyRent: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      // Calculate gross yield if rent is provided
      const grossYield = input.monthlyRent && input.price
        ? (input.monthlyRent * 12 / input.price) * 100
        : undefined;

      // Generate AI analysis using Claude Haiku
      const analysis = await generateAIScoreAnalysis({
        price: input.price,
        location: input.location,
        sqm: input.sqm,
        yearBuilt: input.yearBuilt,
        monthlyRent: input.monthlyRent,
        grossYield,
      });

      // Calculate overall score as weighted average
      const overallScore = Math.round(
        (analysis.factors.location * 0.25) +
        (analysis.factors.pricePerformance * 0.30) +
        (analysis.factors.appreciation * 0.20) +
        (analysis.factors.rentability * 0.25)
      );

      return {
        score: overallScore,
        summary: analysis.summary,
        factors: analysis.factors,
        grossYield,
      };
    }),


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

  // Get AI Score Analysis (Claude Haiku) - cached per property
  getAIScoreAnalysis: publicProcedure
    .input(z.object({ propertyId: z.string().uuid() }))
    .query(async ({ input }) => {
      // Get property with buyer_evaluation
      const property = await queryOne<{
        id: string;
        price: number;
        location: string;
        sqm: number;
        year_built: number | null;
        actual_monthly_rent: number | null;
        buyer_evaluation: {
          ai_score_analysis?: {
            summary: string;
            factors: {
              location: number;
              pricePerformance: number;
              appreciation: number;
              rentability: number;
            };
          };
          rental_income?: { rent_per_sqm?: number };
        } | null;
      }>(
        `SELECT id, price, location, sqm, year_built, actual_monthly_rent, buyer_evaluation
         FROM properties WHERE id = $1`,
        [input.propertyId]
      );

      if (!property) {
        throw new Error('Property not found');
      }

      // Check if cached in buyer_evaluation
      if (property.buyer_evaluation?.ai_score_analysis) {
        return {
          ...property.buyer_evaluation.ai_score_analysis,
          cached: true,
        };
      }

      // Calculate monthly rent and gross yield
      const sqm = Number(property.sqm) || 0;
      const rentPerSqm = property.buyer_evaluation?.rental_income?.rent_per_sqm;
      const monthlyRent = rentPerSqm && sqm
        ? Number(rentPerSqm) * sqm
        : property.actual_monthly_rent
          ? Number(property.actual_monthly_rent)
          : undefined;

      const grossYield = monthlyRent && property.price
        ? (monthlyRent * 12 / property.price) * 100
        : undefined;

      // Generate new analysis with Claude Haiku
      const analysis = await generateAIScoreAnalysis({
        price: property.price,
        location: property.location,
        sqm,
        yearBuilt: property.year_built ?? undefined,
        monthlyRent,
        grossYield,
      });

      // Cache in buyer_evaluation JSON
      const updatedBuyerEvaluation = {
        ...(property.buyer_evaluation || {}),
        ai_score_analysis: analysis,
      };

      await query(
        `UPDATE properties SET buyer_evaluation = $1 WHERE id = $2`,
        [JSON.stringify(updatedBuyerEvaluation), input.propertyId]
      );

      return {
        ...analysis,
        cached: false,
      };
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

  // Generate AI Fazit for Buy vs Rent or Investor analysis
  // Uses protectedProcedure to persist results for logged-in users
  generateAiFazit: protectedProcedure
    .input(z.object({
      mode: z.enum(['investor', 'eigennutzer']),
      propertyId: z.string().uuid(),
      forceRegenerate: z.boolean().optional().default(false),
      // Kennzahlen
      purchasePrice: z.number(),
      monthlyRent: z.number().optional(),
      grossYield: z.number().optional(),
      rentMultiplier: z.number().optional(),
      monthlyCashflow: z.number().optional(),
      cashOnCash: z.number().optional(),
      breakEvenYears: z.number().optional(),
      totalMonthlyCostBuying: z.number().optional(),
      // Finanzierung
      equityPercentage: z.number().optional(),
      interestRate: z.number().optional(),
      loanAmount: z.number().optional(),
      amortizationRate: z.number().optional(),
      monthlyMortgage: z.number().optional(),
      // Nebenkosten & Investition
      totalInvestment: z.number().optional(),
      acquisitionCostsPercent: z.number().optional(),
      // Monatliche Kosten
      monthlyFee: z.number().optional(),
      monthlyMaintenance: z.number().optional(),
      // Jahreswerte
      annualRent: z.number().optional(),
      annualCashflow: z.number().optional(),
      // Eigenkapital
      equityAmount: z.number().optional(),
      // Immobilie
      location: z.string().optional(),
      sqm: z.number().optional(),
      yearBuilt: z.number().optional(),
      propertyType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Check for cached fazit if not forcing regeneration
        if (!input.forceRegenerate) {
          const cached = await queryOne<{
            investor_fazit_text: string | null;
            investor_fazit_tips: string[] | null;
            investor_fazit_verdict: string | null;
            eigennutzer_fazit_text: string | null;
            eigennutzer_fazit_tips: string[] | null;
            eigennutzer_fazit_verdict: string | null;
          }>(
            `SELECT investor_fazit_text, investor_fazit_tips, investor_fazit_verdict,
                    eigennutzer_fazit_text, eigennutzer_fazit_tips, eigennutzer_fazit_verdict
             FROM user_property_parameters
             WHERE user_id = $1 AND property_id = $2`,
            [ctx.user.id, input.propertyId]
          );

          if (cached) {
            const textField = input.mode === 'investor' ? cached.investor_fazit_text : cached.eigennutzer_fazit_text;
            const tipsField = input.mode === 'investor' ? cached.investor_fazit_tips : cached.eigennutzer_fazit_tips;
            const verdictField = input.mode === 'investor' ? cached.investor_fazit_verdict : cached.eigennutzer_fazit_verdict;

            if (textField && verdictField) {
              const verdict = verdictField as 'positive' | 'neutral' | 'negative';
              return {
                text: textField,
                suggestions: tipsField || [],
                verdict,
                color: verdict === 'positive' ? '#22C55E' : verdict === 'neutral' ? '#F59E0B' : '#EF4444',
                cached: true,
              };
            }
          }
        }

        const openai = getOpenAIClient();

        const systemPrompt = input.mode === 'investor'
          ? buildSystemPrompt('investor', `
Du bist ein erfahrener Immobilien-Investment-Analyst. Deine Antwort besteht aus zwei Teilen:

**TEIL 1 - FAZIT (max 4-5 Sätze):**
Bewerte die Investmentqualität basierend auf:
- Bruttorendite (gut: ≥4%, sehr gut: ≥5%)
- Kaufpreisfaktor (gut: ≤20x, sehr gut: ≤18x)
- Monatlicher Cashflow (positiv ist gut)
- Eigenkapitalrendite (Cash on Cash)
- Finanzierungsrisiko (Eigenkapitalquote, Tilgungsrate)

**TEIL 2 - OPTIMIERUNGSTIPPS (2-4 Tipps):**
Gib konkrete, umsetzbare Vorschläge wie der Nutzer das Investment verbessern kann. Beispiele:
- "Verhandeln Sie den Kaufpreis um 5-8% nach unten – bei €X würde die Rendite auf Y% steigen"
- "Erhöhen Sie die Tilgung auf 3% – Laufzeit sinkt von X auf Y Jahre, das Darlehen ist Z Jahre früher abbezahlt"
- "Prüfen Sie, ob die Miete unter Marktniveau liegt – eine Erhöhung auf €X wäre möglich"
- "Holen Sie Vergleichsangebote für die Finanzierung – 0.5% weniger Zins spart €X monatlich"

WICHTIG für Tilgungs-Tipps: Berechne und nenne IMMER die konkrete Laufzeit!
- Aktuelle Laufzeit ≈ 100 / Tilgungsrate (z.B. 2% Tilgung ≈ 50 Jahre, 3% ≈ 33 Jahre, 4% ≈ 25 Jahre)
- Nenne beide Laufzeiten: "von X auf Y Jahre" und die Ersparnis in Jahren

Die Tipps müssen konkrete Zahlen enthalten (berechnet aus den Eingabedaten).

**ANTWORTFORMAT:**
Antworte EXAKT in diesem JSON-Format:
{
  "fazit": "Dein Fazit hier (4-5 Sätze)",
  "tipps": ["Tipp 1 mit konkreten Zahlen", "Tipp 2 mit konkreten Zahlen", "Tipp 3 mit konkreten Zahlen"]
}

Sei direkt, klar und auf Deutsch.`)
          : buildSystemPrompt('investor', `
Du bist ein erfahrener Immobilienberater für Eigennutzer. Deine Antwort besteht aus zwei Teilen:

**TEIL 1 - FAZIT (max 4-5 Sätze):**
Bewerte ob Kaufen sinnvoller ist als Mieten basierend auf:
- Break-Even Jahre (gut: ≤10 Jahre, neutral: ≤15 Jahre)
- Monatliche Kosten Kauf vs. Miete
- Eigenkapitalbedarf und -bindung
- Finanzierungskonditionen (Zinssatz, Tilgung)

**TEIL 2 - OPTIMIERUNGSTIPPS (2-4 Tipps):**
Gib konkrete Vorschläge zur Verbesserung. Beispiele:
- "Bei 5% niedrigerem Kaufpreis sinkt der Break-Even auf X Jahre"
- "Erhöhen Sie die Tilgung auf 3% – Laufzeit sinkt von X auf Y Jahre (Z Jahre kürzer)"
- "Sondertilgungen von €5.000/Jahr verkürzen die Laufzeit um X Jahre und sparen €Y an Zinsen"
- "Höheres Eigenkapital (30%) senkt die monatliche Belastung um €X"

WICHTIG für Tilgungs-Tipps: Berechne und nenne IMMER die konkrete Laufzeit!
- Aktuelle Laufzeit ≈ 100 / Tilgungsrate (z.B. 2% Tilgung ≈ 50 Jahre, 3% ≈ 33 Jahre, 4% ≈ 25 Jahre)
- Nenne: "Laufzeit sinkt von X auf Y Jahre (Z Jahre kürzer)"

Die Tipps müssen konkrete Zahlen enthalten (berechnet aus den Eingabedaten).

**ANTWORTFORMAT:**
Antworte EXAKT in diesem JSON-Format:
{
  "fazit": "Dein Fazit hier (4-5 Sätze)",
  "tipps": ["Tipp 1 mit konkreten Zahlen", "Tipp 2 mit konkreten Zahlen", "Tipp 3 mit konkreten Zahlen"]
}

Sei direkt, klar und auf Deutsch.`);

        const userMessage = input.mode === 'investor'
          ? `Analysiere diese Kapitalanlage-Immobilie:

Kaufpreis: ${input.purchasePrice.toLocaleString('de-DE')} €
${input.totalInvestment !== undefined ? `Gesamtinvestition (inkl. Nebenkosten): ${input.totalInvestment.toLocaleString('de-DE')} €` : ''}
${input.location ? `Lage: ${input.location}` : ''}
${input.sqm ? `Wohnfläche: ${input.sqm} m²` : ''}
${input.yearBuilt ? `Baujahr: ${input.yearBuilt}` : ''}

Investment-Kennzahlen:
${input.grossYield !== undefined ? `- Bruttorendite: ${input.grossYield.toFixed(1)}%` : ''}
${input.rentMultiplier !== undefined ? `- Kaufpreisfaktor: ${input.rentMultiplier.toFixed(1)}x` : ''}
${input.monthlyCashflow !== undefined ? `- Monatlicher Cashflow: ${input.monthlyCashflow.toLocaleString('de-DE')} €` : ''}
${input.annualCashflow !== undefined ? `- Jahres-Cashflow: ${input.annualCashflow.toLocaleString('de-DE')} €` : ''}
${input.cashOnCash !== undefined ? `- Cash on Cash Rendite: ${input.cashOnCash.toFixed(1)}%` : ''}
${input.monthlyRent !== undefined ? `- Monatliche Mieteinnahmen: ${input.monthlyRent.toLocaleString('de-DE')} €` : ''}
${input.annualRent !== undefined ? `- Jahresmiete: ${input.annualRent.toLocaleString('de-DE')} €` : ''}

Monatliche Kosten:
${input.monthlyMortgage !== undefined ? `- Kreditrate (Zins + Tilgung): ${input.monthlyMortgage.toLocaleString('de-DE')} €` : ''}
${input.monthlyFee !== undefined ? `- Hausgeld: ${input.monthlyFee.toLocaleString('de-DE')} €` : ''}
${input.monthlyMaintenance !== undefined ? `- Instandhaltungsrücklage: ${input.monthlyMaintenance.toLocaleString('de-DE')} €` : ''}

Finanzierung:
${input.equityPercentage !== undefined ? `- Eigenkapitalquote: ${input.equityPercentage}%` : ''}
${input.equityAmount !== undefined ? `- Eigenkapital: ${input.equityAmount.toLocaleString('de-DE')} €` : ''}
${input.interestRate !== undefined ? `- Zinssatz: ${input.interestRate}%` : ''}
${input.amortizationRate !== undefined ? `- Tilgungsrate: ${input.amortizationRate}%` : ''}
${input.loanAmount !== undefined ? `- Darlehensbetrag: ${input.loanAmount.toLocaleString('de-DE')} €` : ''}

Antworte im angeforderten JSON-Format mit Fazit und Tipps.`
          : `Analysiere diese Immobilie für einen Eigennutzer (Kaufen vs. Mieten):

Kaufpreis: ${input.purchasePrice.toLocaleString('de-DE')} €
${input.totalInvestment !== undefined ? `Gesamtinvestition (inkl. Nebenkosten): ${input.totalInvestment.toLocaleString('de-DE')} €` : ''}
${input.location ? `Lage: ${input.location}` : ''}
${input.sqm ? `Wohnfläche: ${input.sqm} m²` : ''}
${input.yearBuilt ? `Baujahr: ${input.yearBuilt}` : ''}

Vergleich Kaufen vs. Mieten:
${input.breakEvenYears !== undefined ? `- Break-Even: ${input.breakEvenYears} Jahre` : ''}
${input.monthlyRent !== undefined ? `- Monatliche Miete (alternativ): ${input.monthlyRent.toLocaleString('de-DE')} €` : ''}
${input.totalMonthlyCostBuying !== undefined ? `- Monatliche Kosten beim Kauf: ${input.totalMonthlyCostBuying.toLocaleString('de-DE')} €` : ''}

Monatliche Kosten beim Kauf:
${input.monthlyMortgage !== undefined ? `- Kreditrate (Zins + Tilgung): ${input.monthlyMortgage.toLocaleString('de-DE')} €` : ''}
${input.monthlyFee !== undefined ? `- Hausgeld: ${input.monthlyFee.toLocaleString('de-DE')} €` : ''}
${input.monthlyMaintenance !== undefined ? `- Instandhaltungsrücklage: ${input.monthlyMaintenance.toLocaleString('de-DE')} €` : ''}

Finanzierung:
${input.equityPercentage !== undefined ? `- Eigenkapitalquote: ${input.equityPercentage}%` : ''}
${input.equityAmount !== undefined ? `- Eigenkapital: ${input.equityAmount.toLocaleString('de-DE')} €` : ''}
${input.interestRate !== undefined ? `- Zinssatz: ${input.interestRate}%` : ''}
${input.amortizationRate !== undefined ? `- Tilgungsrate: ${input.amortizationRate}%` : ''}
${input.loanAmount !== undefined ? `- Darlehensbetrag: ${input.loanAmount.toLocaleString('de-DE')} €` : ''}

Antworte im angeforderten JSON-Format mit Fazit und Tipps.`;

        // Run OpenAI and Claude in parallel
        const [openaiResult, claudeResult] = await Promise.allSettled([
          // OpenAI request
          (async () => {
            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              temperature: 0.7,
              max_tokens: 600,
              response_format: { type: 'json_object' },
            });
            const rawContent = response.choices[0]?.message?.content?.trim() || '{}';
            try {
              const parsed = JSON.parse(rawContent);
              return { fazit: parsed.fazit || '', tipps: parsed.tipps || [] };
            } catch {
              return { fazit: rawContent, tipps: [] };
            }
          })(),
          // Claude request
          generateClaudeFazit(systemPrompt, userMessage),
        ]);

        // Extract OpenAI result
        const openaiParsed = openaiResult.status === 'fulfilled'
          ? openaiResult.value
          : { fazit: 'OpenAI-Fehler: ' + (openaiResult.reason?.message || 'Unbekannt'), tipps: [] };

        // Extract Claude result
        const claudeParsed = claudeResult.status === 'fulfilled'
          ? claudeResult.value
          : { fazit: 'Claude-Fehler: ' + (claudeResult.reason?.message || 'Unbekannt'), tipps: [] };

        // Use OpenAI result as primary (for backwards compatibility)
        const fazitText = openaiParsed.fazit;
        const suggestions = openaiParsed.tipps;

        // Determine verdict based on key metrics
        let verdict: 'positive' | 'neutral' | 'negative' = 'neutral';

        if (input.mode === 'investor') {
          if (input.grossYield !== undefined) {
            if (input.grossYield >= 4 && (input.monthlyCashflow === undefined || input.monthlyCashflow >= 0)) {
              verdict = 'positive';
            } else if (input.grossYield < 3 || (input.monthlyCashflow !== undefined && input.monthlyCashflow < -300)) {
              verdict = 'negative';
            }
          }
        } else {
          if (input.breakEvenYears !== undefined) {
            if (input.breakEvenYears <= 10) {
              verdict = 'positive';
            } else if (input.breakEvenYears > 20) {
              verdict = 'negative';
            }
          }
        }

        // Save generated fazit to database (OpenAI only for now)
        const textColumn = input.mode === 'investor' ? 'investor_fazit_text' : 'eigennutzer_fazit_text';
        const tipsColumn = input.mode === 'investor' ? 'investor_fazit_tips' : 'eigennutzer_fazit_tips';
        const verdictColumn = input.mode === 'investor' ? 'investor_fazit_verdict' : 'eigennutzer_fazit_verdict';

        await query(
          `UPDATE user_property_parameters
           SET ${textColumn} = $1,
               ${tipsColumn} = $2,
               ${verdictColumn} = $3,
               fazit_generated_at = NOW()
           WHERE user_id = $4 AND property_id = $5`,
          [fazitText, JSON.stringify(suggestions), verdict, ctx.user.id, input.propertyId]
        );

        // Return both results for comparison
        return {
          text: fazitText,
          suggestions,
          verdict,
          color: verdict === 'positive' ? '#22C55E' : verdict === 'neutral' ? '#F59E0B' : '#EF4444',
          cached: false,
          // New: Claude comparison data
          claude: {
            text: claudeParsed.fazit,
            suggestions: claudeParsed.tipps,
          },
          openai: {
            text: openaiParsed.fazit,
            suggestions: openaiParsed.tipps,
          },
        };
      } catch (error) {
        console.error('AI Fazit generation error:', error);
        throw new Error('KI-Fazit konnte nicht generiert werden');
      }
    }),
});
