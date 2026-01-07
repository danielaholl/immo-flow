/**
 * OpenAI Client Singleton
 * Shared OpenAI client instance used across all services
 */
import OpenAI from 'openai';

// Re-export prompt utilities for convenience
export { buildSystemPrompt, type PromptContext } from '../prompts/master-prompt';

let openaiClient: OpenAI | null = null;

/**
 * Get or create shared OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

// Export a getter for backwards compatibility
export const openai = new Proxy({} as OpenAI, {
  get: (_, prop) => {
    const client = getOpenAIClient();
    return (client as any)[prop];
  },
});

/**
 * Investor Negotiation Advice Types
 */
export interface InvestorAdviceInput {
  propertyTitle: string;
  price: number;
  sqm: number;
  location: string;
  postalCode?: string;
  yearBuilt?: number;
  currentRent?: number;
  marketAvgPricePerSqm?: number;
  marketAvgRentPerSqm?: number;
  cashflow: number;
  breakEvenPrice?: number;
  eigenkapital: number; // Percentage
  tilgung: number; // Percentage
  interestRate: number;
  hausgeld?: number;
  expectedHausgeldPerSqm?: number;
  expectedHausgeld?: number;
  // Fair value calculation results
  fairValue: number;
  actualYield: number;
  valueDeviation: number;
}

export interface InvestorAdviceResult {
  fazit: string;
  targetPrice: number;
  negotiationStrategy: string;
  empfehlung: string;
}

/**
 * Eigennutzer (Owner-Occupier) Advice Types
 */
export interface EigennutzerAdviceInput {
  propertyTitle: string;
  price: number;
  sqm: number;
  location: string;
  postalCode?: string;
  yearBuilt?: number;

  // Eigennutzer-spezifische Metriken
  breakEvenYears: number;
  monthlyRentCost: number;       // Miete, die man zahlen würde
  monthlyOwnershipCost: number;  // Monatliche Kosten beim Kauf (Rate + Hausgeld + Instandhaltung)
  monthlyCostDifference: number; // Differenz (positiv = Kaufen günstiger)

  // Finanzierung
  eigenkapital: number;          // Eigenkapital in EUR (nicht %)
  eigenkapitalPercent: number;   // Eigenkapital in %
  interestRate: number;
  amortizationRate: number;

  // Optional: Marktdaten
  marketAvgRentPerSqm?: number;
  marketAvgPricePerSqm?: number;
}

export interface EigennutzerAdviceResult {
  fazit: string;
  recommendation: 'KAUFEN' | 'MIETEN' | 'AUSGEGLICHEN';
  reasoning: string;
}

/**
 * Generate investor negotiation advice using OpenAI GPT-4o
 * Focus: Deal optimization and aggressive negotiation
 */
export async function generateOpenAIInvestorAdvice(
  input: InvestorAdviceInput
): Promise<InvestorAdviceResult> {
  const client = getOpenAIClient();

  const systemPrompt = `Du bist ein erfahrener Immobilieninvestor, der Objekte basierend auf ihrer fairen Marktbewertung und Rentabilität bewertet.

BEWERTUNGSMETHODIK:
1. **Fair Value Analyse**: Objektiver Wert basierend auf Marktdaten, Rendite-Ziel (4%) und Break-Even
2. **Rendite-Prüfung**: Ist-Rendite am aktuellen Preis
3. **Cashflow-Analyse**: Monatliche Einnahmen vs. Ausgaben
4. **Verhandlungspotential**: Nur wenn Preis über Fair Value liegt

ENTSCHEIDUNGSLOGIK:
- **KAUFEN**:
  * Preis ≤ Fair Value (+5% Toleranz)
  * UND Cashflow positiv
  * UND Ist-Rendite ≥ 4%
  * → targetPrice = aktueller Preis (keine Verhandlung nötig)

- **VERHANDELN & KAUFEN**:
  * Preis 5-25% über Fair Value
  * ODER Cashflow leicht negativ aber behebbar
  * ODER Ist-Rendite 3-4% (mit Verhandlung verbesserbar)
  * → targetPrice = Fair Value

- **FINGER WEG**:
  * Preis >25% über Fair Value
  * ODER Cashflow stark negativ (<-200€/Mo)
  * ODER Ist-Rendite <2%
  * → targetPrice = Fair Value × 0.9 (zur Info)

WICHTIG:
- Wenn Deal bereits gut ist (Preis nahe/unter Fair Value, positive Rendite), empfiehl KAUFEN ohne Verhandlung
- targetPrice ist der faire Marktwert, NICHT automatisch niedriger als Angebotspreis
- Nenne konkrete Zahlen: Fair Value, Ist-Rendite, Cashflow-Potential

HAUSGELD & AfA:
- Bewerte Hausgeld vs. Durchschnitt als Verhandlungshebel
- Bei Altbauten >40 Jahre: AfA-Optimierung durch Restnutzungsdauer-Gutachten erwähnen

Antworte NUR mit validem JSON:
{
  "fazit": "4-5 prägnante Sätze: Fair Value, Ist-Rendite, Cashflow, Empfehlung mit Begründung",
  "targetPrice": <Fair Value oder aktueller Preis wenn bereits fair>,
  "negotiationStrategy": "1-2 Sätze: Warum dieser Preis, welche Verhandlung (falls nötig)",
  "empfehlung": "KAUFEN | VERHANDELN & KAUFEN | FINGER WEG - mit kurzer Begründung"
}`;

  // Calculate market comparison
  const marketPrice = input.marketAvgPricePerSqm && input.sqm > 0
    ? input.marketAvgPricePerSqm * input.sqm
    : null;
  const priceVsMarket = marketPrice
    ? ((input.price - marketPrice) / marketPrice * 100).toFixed(1)
    : 'unbekannt';

  const marketRent = input.marketAvgRentPerSqm && input.sqm > 0
    ? input.marketAvgRentPerSqm * input.sqm
    : null;
  const rentVsMarket = marketRent && input.currentRent
    ? ((input.currentRent - marketRent) / marketRent * 100).toFixed(1)
    : 'unbekannt';

  // Calculate hausgeld comparison
  const currentYear = new Date().getFullYear();
  const propertyAge = input.yearBuilt ? currentYear - input.yearBuilt : null;
  const hausgeldPerSqm = input.hausgeld && input.sqm > 0 ? input.hausgeld / input.sqm : null;
  const hausgeldDeviation = hausgeldPerSqm && input.expectedHausgeldPerSqm
    ? ((hausgeldPerSqm - input.expectedHausgeldPerSqm) / input.expectedHausgeldPerSqm * 100).toFixed(1)
    : null;

  const userMessage = `Bewerte diese Immobilie als Investition:

IMMOBILIE:
- Objekt: ${input.propertyTitle}
- Angebotspreis: ${input.price.toLocaleString('de-DE')}€
- Wohnfläche: ${input.sqm}m²
- Lage: ${input.location}${input.postalCode ? ` (PLZ: ${input.postalCode})` : ''}
${input.yearBuilt ? `- Baujahr: ${input.yearBuilt} (${propertyAge} Jahre alt)` : ''}

BEWERTUNG (OBJEKTIV):
- Fair Value (berechnet): ${input.fairValue.toLocaleString('de-DE')}€
- Preis-Abweichung: ${input.valueDeviation > 0 ? '+' : ''}${input.valueDeviation.toFixed(1)}% ${input.valueDeviation > 0 ? 'ÜBER' : 'unter'} Fair Value
- Ist-Rendite: ${(input.actualYield * 100).toFixed(2)}%

MARKTKONTEXT:
${marketPrice ? `- PLZ-Durchschnitt: ${marketPrice.toLocaleString('de-DE')}€` : '- Kein Marktpreis verfügbar'}
${marketRent ? `- Markt-Miete: ${marketRent.toLocaleString('de-DE')}€/Mo` : ''}

ERTRAGSLAGE:
${input.currentRent ? `- Ist-Miete: ${input.currentRent.toLocaleString('de-DE')}€/Mo` : '- Keine Mietdaten'}
- Monatl. Cashflow: ${input.cashflow.toFixed(2)}€/Mo ${input.cashflow >= 0 ? '✓' : '✗'}
${input.breakEvenPrice ? `- Break-Even bei: ${input.breakEvenPrice.toLocaleString('de-DE')}€` : ''}

FINANZIERUNG:
- Eigenkapital: ${input.eigenkapital}%
- Tilgung: ${input.tilgung}%
- Zinssatz: ${input.interestRate}%

NEBENKOSTEN:
${input.hausgeld ? `- Hausgeld: ${input.hausgeld.toLocaleString('de-DE')}€/Mo (${hausgeldPerSqm?.toFixed(2)}€/m²)` : '- Kein Hausgeld angegeben'}
${input.expectedHausgeldPerSqm ? `- Durchschnitt: ${input.expectedHausgeldPerSqm.toFixed(2)}€/m²` : ''}
${hausgeldDeviation ? `- Abweichung: ${hausgeldDeviation}%` : ''}

AUFGABE:
Bewerte basierend auf Fair Value (${input.fairValue.toLocaleString('de-DE')}€) und Ist-Rendite (${(input.actualYield * 100).toFixed(2)}%):
1. Ist der aktuelle Preis fair, zu hoch oder zu niedrig?
2. Ist die Rendite ausreichend (Ziel: ≥4%)?
3. Ist Cashflow positiv oder optimierbar?
4. KAUFEN (wenn bereits gut) oder VERHANDELN (wenn zu teuer)?
5. targetPrice = Fair Value (nicht automatisch Rabatt!)

MIETOPTIMIERUNG bei negativem/niedrigem Cashflow:
- Möblierte Vermietung (+20-30% möglich)
- Airbnb/Kurzzeitvermietung (lageabhängig)
- Nenne KONKRETE Zahlen: "Mit möblierter Vermietung +200€/Mo → Cashflow würde +120€/Mo"`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o', // GPT-4o for high quality analysis with JSON support
    temperature: 0.3,
    max_tokens: 1000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);

    // Validate and sanitize
    return {
      fazit: parsed.fazit || 'Keine Analyse verfügbar.',
      targetPrice: typeof parsed.targetPrice === 'number' ? Math.round(parsed.targetPrice) : input.fairValue || Math.round(input.price * 0.95),
      negotiationStrategy: parsed.negotiationStrategy || 'Bewertung basierend auf Fair Value.',
      empfehlung: parsed.empfehlung || (input.actualYield >= 0.04 && input.cashflow > 0
        ? 'KAUFEN - Rendite und Cashflow sind gut'
        : 'VERHANDELN & KAUFEN - Preis auf Fair Value reduzieren'),
    };
  } catch (error) {
    // Fallback if JSON parsing fails - use fair value instead of automatic discount
    return {
      fazit: content || 'OpenAI-Analyse konnte nicht durchgeführt werden.',
      targetPrice: input.fairValue || Math.round(input.price * 0.95),
      negotiationStrategy: 'Bewertung basierend auf Fair Value-Berechnung.',
      empfehlung: input.actualYield >= 0.04 && input.cashflow > 0
        ? 'KAUFEN - Rendite und Cashflow sind gut'
        : 'VERHANDELN & KAUFEN - Preis auf Fair Value reduzieren',
    };
  }
}

/**
 * Generate owner-occupier buy-vs-rent advice using OpenAI GPT-4o
 * Focus: Personal finance, flexibility, life planning perspective
 */
export async function generateOpenAIEigennutzerAdvice(
  input: EigennutzerAdviceInput
): Promise<EigennutzerAdviceResult> {
  const client = getOpenAIClient();

  const systemPrompt = `Du bist ein persönlicher Finanzberater, der Eigennutzer bei der Entscheidung "Kaufen vs. Mieten" unterstützt.

BEWERTUNGSMETHODIK:
1. **Break-Even Analyse**: Wie schnell amortisieren sich die Kaufnebenkosten?
2. **Monatliche Belastung**: Kaufen vs. Mieten im direkten Vergleich
3. **Flexibilität**: Lebensplanung, Jobwechsel, Familie
4. **Vermögensaufbau**: Eigenkapital-Bindung vs. Tilgung als Sparplan

ENTSCHEIDUNGSLOGIK:
- **KAUFEN**:
  * Break-Even ≤ 10 Jahre
  * UND monatliche Kosten ≤ Miete (+10% Toleranz)
  * UND Standortsicherheit (Job, Familie)
  * Begründung: "Schnelle Amortisation + günstige Kosten + Vermögensaufbau"

- **AUSGEGLICHEN**:
  * Break-Even 10-20 Jahre
  * ODER monatliche Kosten 10-30% über Miete
  * ODER mittelfristige Bindung möglich
  * Begründung: "Hängt von persönlicher Situation ab"

- **MIETEN**:
  * Break-Even > 20 Jahre
  * ODER monatliche Kosten > 30% über Miete
  * ODER hohe Flexibilität benötigt
  * Begründung: "Finanziell nicht optimal oder zu geringe Planungssicherheit"

WICHTIG:
- Nenne konkrete Zahlen: Break-Even, monatliche Differenz
- Berücksichtige Lebensplanung und Flexibilität
- Bei Altbau (>50 Jahre): Instandhaltungsrisiko erwähnen
- Bei hohem EK: Opportunitätskosten (ETF-Alternative) erwähnen

Antworte NUR mit validem JSON:
{
  "fazit": "4-5 prägnante Sätze: Break-Even, monatliche Kosten, Flexibilität, Empfehlung",
  "recommendation": "KAUFEN | MIETEN | AUSGEGLICHEN",
  "reasoning": "1-2 Sätze: Warum diese Empfehlung, Kernpunkte"
}`;

  // Calculate metrics
  const monthlyDiff = input.monthlyRentCost - input.monthlyOwnershipCost;
  const monthlyDiffPercent = input.monthlyRentCost > 0
    ? (monthlyDiff / input.monthlyRentCost * 100).toFixed(1)
    : '0';

  const propertyAge = input.yearBuilt ? new Date().getFullYear() - input.yearBuilt : null;

  // Market comparison
  const marketRent = input.marketAvgRentPerSqm && input.sqm > 0
    ? input.marketAvgRentPerSqm * input.sqm
    : null;
  const rentVsMarket = marketRent && input.monthlyRentCost
    ? ((input.monthlyRentCost - marketRent) / marketRent * 100).toFixed(1)
    : 'unbekannt';

  const userMessage = `Bewerte diese Immobilie für Eigennutzer (Kaufen vs. Mieten):

IMMOBILIE:
- Objekt: ${input.propertyTitle}
- Kaufpreis: ${input.price.toLocaleString('de-DE')}€
- Wohnfläche: ${input.sqm}m²
- Lage: ${input.location}${input.postalCode ? ` (PLZ: ${input.postalCode})` : ''}
${input.yearBuilt ? `- Baujahr: ${input.yearBuilt} (${propertyAge} Jahre alt)` : ''}

KAUFEN VS. MIETEN:
- Break-Even: ${input.breakEvenYears} Jahre
- Miete/Monat: ${input.monthlyRentCost.toLocaleString('de-DE')}€
- Kauf/Monat: ${input.monthlyOwnershipCost.toLocaleString('de-DE')}€ (Rate + Hausgeld + Instandhaltung)
- Differenz: ${monthlyDiff >= 0 ? '+' : ''}${monthlyDiff.toFixed(2)}€/Mo (${monthlyDiff >= 0 ? 'Kaufen günstiger' : 'Mieten günstiger'} um ${Math.abs(Number(monthlyDiffPercent))}%)

FINANZIERUNG:
- Eigenkapital: ${input.eigenkapital.toLocaleString('de-DE')}€ (${input.eigenkapitalPercent}%)
- Zinssatz: ${input.interestRate}%
- Tilgung: ${input.amortizationRate}%

${marketRent ? `MARKTKONTEXT:\n- Markt-Miete: ${marketRent.toLocaleString('de-DE')}€/Mo\n- Ihre Miete vs. Markt: ${rentVsMarket}%\n` : ''}

AUFGABE:
1. Ist der Break-Even von ${input.breakEvenYears} Jahren akzeptabel?
2. Sind die monatlichen Kosten (${input.monthlyOwnershipCost.toLocaleString('de-DE')}€) vs. Miete (${input.monthlyRentCost.toLocaleString('de-DE')}€) fair?
3. KAUFEN (schneller Break-Even + günstig) oder MIETEN (lange Amortisation oder hohe Kosten)?
4. Flexibilitätsaspekte basierend auf Standort und Objektalter

ZUSÄTZLICH:
${input.eigenkapital > 100000 ? `- Bei ${input.eigenkapital.toLocaleString('de-DE')}€ EK: ETF-Alternative mit 6-7% p.a. erwähnen` : ''}
${propertyAge && propertyAge > 50 ? '- Altbau >50 Jahre: Instandhaltungsrisiko beachten' : ''}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 800,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '{}';

  try {
    const parsed = JSON.parse(content);

    return {
      fazit: parsed.fazit || 'Keine Analyse verfügbar.',
      recommendation: ['KAUFEN', 'MIETEN', 'AUSGEGLICHEN'].includes(parsed.recommendation)
        ? parsed.recommendation
        : 'AUSGEGLICHEN',
      reasoning: parsed.reasoning || 'Bewertung basierend auf Break-Even und monatlichen Kosten.',
    };
  } catch (error) {
    // Fallback recommendation
    const fallbackRec = input.breakEvenYears <= 10 && monthlyDiff >= 0
      ? 'KAUFEN'
      : input.breakEvenYears > 20 || monthlyDiff < -200
        ? 'MIETEN'
        : 'AUSGEGLICHEN';

    return {
      fazit: content || 'OpenAI-Analyse konnte nicht durchgeführt werden.',
      recommendation: fallbackRec,
      reasoning: 'Bewertung basierend auf Break-Even und Kostenvergleich.',
    };
  }
}
