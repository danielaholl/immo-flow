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
 * Eigennutzer (Owner-Occupier) Advice Types
 */
export interface ClaudeEigennutzerAdviceInput {
  propertyTitle: string;
  price: number;
  sqm: number;
  location: string;
  postalCode?: string;
  yearBuilt?: number;

  // Eigennutzer-spezifische Metriken
  breakEvenYears: number;
  monthlyRentCost: number;
  monthlyOwnershipCost: number;
  monthlyCostDifference: number;

  // Finanzierung
  eigenkapital: number;
  eigenkapitalPercent: number;
  interestRate: number;
  amortizationRate: number;

  // Optional: Marktdaten
  marketAvgRentPerSqm?: number;
  marketAvgPricePerSqm?: number;
}

export interface ClaudeEigennutzerAdviceResult {
  fazit: string;
  recommendation: 'KAUFEN' | 'MIETEN' | 'AUSGEGLICHEN';
  reasoning: string;
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

/**
 * Generate owner-occupier buy-vs-rent advice using Claude Opus
 * Focus: Holistic life planning, risk assessment, long-term perspective
 */
export async function generateClaudeEigennutzerAdvice(
  input: ClaudeEigennutzerAdviceInput
): Promise<ClaudeEigennutzerAdviceResult> {
  const client = getClaudeClient();

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

- **AUSGEGLICHEN**:
  * Break-Even 10-20 Jahre
  * ODER monatliche Kosten 10-30% über Miete
  * ODER mittelfristige Bindung möglich

- **MIETEN**:
  * Break-Even > 20 Jahre
  * ODER monatliche Kosten > 30% über Miete
  * ODER hohe Flexibilität benötigt

WICHTIG:
- Nenne konkrete Zahlen und Szenarien
- Berücksichtige persönliche Lebensplanung
- Erwähne Risiken (Zinsbindung, Instandhaltung)

Antworte NUR mit validem JSON:
{
  "fazit": "4-5 prägnante Sätze mit konkreten Zahlen und Empfehlung",
  "recommendation": "KAUFEN | MIETEN | AUSGEGLICHEN",
  "reasoning": "1-2 Sätze Begründung"
}`;

  const monthlyDiff = input.monthlyRentCost - input.monthlyOwnershipCost;
  const monthlyDiffPercent = input.monthlyRentCost > 0
    ? (monthlyDiff / input.monthlyRentCost * 100).toFixed(1)
    : '0';

  const propertyAge = input.yearBuilt ? new Date().getFullYear() - input.yearBuilt : null;

  const marketRent = input.marketAvgRentPerSqm && input.sqm > 0
    ? input.marketAvgRentPerSqm * input.sqm
    : null;

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
- Kauf/Monat: ${input.monthlyOwnershipCost.toLocaleString('de-DE')}€
- Differenz: ${monthlyDiff >= 0 ? '+' : ''}${monthlyDiff.toFixed(2)}€/Mo

FINANZIERUNG:
- Eigenkapital: ${input.eigenkapital.toLocaleString('de-DE')}€ (${input.eigenkapitalPercent}%)
- Zinssatz: ${input.interestRate}%
- Tilgung: ${input.amortizationRate}%

${marketRent ? `MARKTKONTEXT:\n- Markt-Miete: ${marketRent.toLocaleString('de-DE')}€/Mo` : ''}

Bewerte: Sollte man kaufen oder mieten?`;

  const response = await client.messages.create({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 800,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '{}';

  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
    const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
    const parsed = JSON.parse(jsonStr);

    return {
      fazit: parsed.fazit || 'Keine Analyse verfügbar.',
      recommendation: ['KAUFEN', 'MIETEN', 'AUSGEGLICHEN'].includes(parsed.recommendation)
        ? parsed.recommendation
        : 'AUSGEGLICHEN',
      reasoning: parsed.reasoning || 'Bewertung basierend auf Break-Even.',
    };
  } catch (error) {
    const fallbackRec = input.breakEvenYears <= 10 && monthlyDiff >= 0
      ? 'KAUFEN'
      : input.breakEvenYears > 20 || monthlyDiff < -200
        ? 'MIETEN'
        : 'AUSGEGLICHEN';

    return {
      fazit: rawContent || 'Claude-Analyse konnte nicht durchgeführt werden.',
      recommendation: fallbackRec,
      reasoning: 'Bewertung basierend auf Break-Even.',
    };
  }
}
