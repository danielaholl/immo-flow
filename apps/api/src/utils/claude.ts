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
    model: 'claude-3-5-haiku-20241022',
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
    model: 'claude-3-5-haiku-20241022',
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
