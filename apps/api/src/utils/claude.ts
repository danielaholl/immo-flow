/**
 * Claude (Anthropic) Client Singleton
 * Shared Anthropic client instance for Claude API calls
 */
import Anthropic from '@anthropic-ai/sdk';

let claudeClient: Anthropic | null = null;

/**
 * Get or create shared Claude client instance
 */
export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    claudeClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  return claudeClient;
}

/**
 * Generate a chat completion using Claude
 * Returns the same structure as OpenAI for easy comparison
 */
export async function generateClaudeFazit(
  systemPrompt: string,
  userMessage: string
): Promise<{ fazit: string; tipps: string[] }> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', // Claude Opus 4.5 for highest quality analysis
    max_tokens: 600,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  // Extract text content from response
  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '{}';

  // Parse JSON response
  try {
    // Claude might wrap JSON in markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
    const parsed = JSON.parse(jsonStr);
    return {
      fazit: parsed.fazit || '',
      tipps: Array.isArray(parsed.tipps) ? parsed.tipps : [],
    };
  } catch {
    // Fallback: treat entire response as fazit text
    return { fazit: rawContent, tipps: [] };
  }
}

/**
 * AI Score Analysis Types
 */
export interface AIScoreAnalysisInput {
  price: number;
  location: string;
  sqm: number;
  yearBuilt?: number;
  monthlyRent?: number;
  grossYield?: number;
}

export interface AIScoreAnalysisResult {
  summary: string;
  factors: {
    location: number;
    pricePerformance: number;
    appreciation: number;
    rentability: number;
  };
}

/**
 * Investor Negotiation Advice Types (matching OpenAI interface)
 */
export interface ClaudeInvestorAdviceInput {
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

export interface ClaudeInvestorAdviceResult {
  fazit: string;
  targetPrice: number;
  negotiationStrategy: string;
  empfehlung: string;
}

/**
 * Generate investor negotiation advice using Claude Opus
 * Focus: Aggressive leverage optimization and maximum returns
 */
export async function generateClaudeInvestorAdvice(
  input: ClaudeInvestorAdviceInput
): Promise<ClaudeInvestorAdviceResult> {
  const client = getClaudeClient();

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

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', // Claude Opus 4.5 for highest quality analysis
    max_tokens: 1000,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '{}';

  try {
    // Handle potential markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
    const parsed = JSON.parse(jsonStr);

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
      fazit: rawContent || 'Claude-Analyse konnte nicht durchgeführt werden.',
      targetPrice: input.fairValue || Math.round(input.price * 0.95),
      negotiationStrategy: 'Bewertung basierend auf Fair Value-Berechnung.',
      empfehlung: input.actualYield >= 0.04 && input.cashflow > 0
        ? 'KAUFEN - Rendite und Cashflow sind gut'
        : 'VERHANDELN & KAUFEN - Preis auf Fair Value reduzieren',
    };
  }
}

/**
 * Generate AI Score Analysis using Claude Haiku
 * Analyzes property investment potential and returns summary + factor scores
 */
export async function generateAIScoreAnalysis(
  propertyData: AIScoreAnalysisInput
): Promise<AIScoreAnalysisResult> {
  const client = getClaudeClient();

  const systemPrompt = `Du bist ein erfahrener Immobilien-Investment-Analyst.
Bewerte Immobilien präzise und datenbasiert.
Antworte IMMER und NUR mit validem JSON ohne Markdown-Formatierung.`;

  const userMessage = `Bewerte diese Immobilie als Investment:

Daten:
- Kaufpreis: ${propertyData.price.toLocaleString('de-DE')}€
- Lage: ${propertyData.location}
- Wohnfläche: ${propertyData.sqm} m²
${propertyData.yearBuilt ? `- Baujahr: ${propertyData.yearBuilt}` : ''}
${propertyData.monthlyRent ? `- Geschätzte Miete: ${propertyData.monthlyRent.toLocaleString('de-DE')}€/Monat` : ''}
${propertyData.grossYield ? `- Bruttorendite: ${propertyData.grossYield.toFixed(2)}%` : ''}

Antworte NUR mit diesem JSON-Format:
{
  "summary": "Max 3 kurze Sätze über das Investment-Potential dieser Immobilie.",
  "factors": {
    "location": <0-100 Lage & Mikrolage Bewertung>,
    "pricePerformance": <0-100 Preis-Leistungs-Verhältnis>,
    "appreciation": <0-100 Wertsteigerungspotential>,
    "rentability": <0-100 Vermietbarkeit>
  }
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101', // Claude Opus 4.5 for highest quality analysis
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '{}';

  try {
    // Handle potential markdown code blocks
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
    const parsed = JSON.parse(jsonStr);

    // Validate and clamp scores to 0-100
    const clamp = (val: number) => Math.max(0, Math.min(100, Math.round(val)));

    return {
      summary: parsed.summary || 'Keine Analyse verfügbar.',
      factors: {
        location: clamp(parsed.factors?.location ?? 50),
        pricePerformance: clamp(parsed.factors?.pricePerformance ?? 50),
        appreciation: clamp(parsed.factors?.appreciation ?? 50),
        rentability: clamp(parsed.factors?.rentability ?? 50),
      },
    };
  } catch {
    // Fallback with neutral scores
    return {
      summary: 'KI-Analyse konnte nicht durchgeführt werden.',
      factors: {
        location: 50,
        pricePerformance: 50,
        appreciation: 50,
        rentability: 50,
      },
    };
  }
}
