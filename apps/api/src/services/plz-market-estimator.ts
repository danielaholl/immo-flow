/**
 * PLZ Market Estimator Service
 * AI-powered market data estimation for German postal codes
 * Uses Claude Haiku to estimate purchase prices and rent per sqm (10x cheaper than GPT-4o)
 */
import { query } from '../db.js';
import { getClaudeClient } from '../utils/claude.js';

export interface PLZMarketEstimate {
  plz: string;
  city: string;
  avg_purchase_price_sqm: number;
  purchase_price_min: number;
  purchase_price_max: number;
  avg_rent_sqm: number;
  rent_min: number;
  rent_max: number;
  confidence_score: number;
  grunderwerbsteuer_rate?: number;
}

interface PLZData {
  plz: string;
  city: string;
  district: string | null;
  federal_state: string;
}

// AI response format (different from PLZMarketEstimate)
interface AIEstimateItem {
  plz: string;
  avg_purchase_price_sqm: number;
  purchase_price_min: number;
  purchase_price_max: number;
  avg_rent_sqm: number;
  rent_min: number;
  rent_max: number;
  confidence?: number;
}

interface BatchEstimateResult {
  estimates: AIEstimateItem[];
  reasoning: string;
}

/**
 * Estimate market data for a single PLZ using AI
 */
export async function estimateMarketDataForPLZ(
  plz: string,
  city: string,
  federalState: string
): Promise<PLZMarketEstimate> {
  const claude = getClaudeClient();

  const prompt = `Es ist DEZEMBER 2025. Du bist ein Immobilien-Marktexperte mit tiefem Wissen über deutsche Immobilienpreise.

Schätze die AKTUELLEN Immobilienpreise für diese Postleitzahl:

PLZ: ${plz}
Ort: ${city}
Bundesland: ${federalState}

Basierend auf deinem Wissen über:
- Aktuelle Marktpreise in dieser Region (Dezember 2025)
- Stadtgröße und wirtschaftliche Stärke
- Lage innerhalb der Stadt/Region
- Infrastruktur und Entwicklung

Schätze:
1. Durchschnittlicher Kaufpreis pro m² für Eigentumswohnungen (70-100m², Baujahr nach 1990)
2. Preisspanne (min/max)
3. Durchschnittliche Kaltmiete pro m² (vergleichbare Wohnungen)
4. Mietpreisspanne (min/max)

Antworte NUR mit einem JSON-Objekt (ohne Markdown):
{
  "avg_purchase_price_sqm": <Zahl in EUR>,
  "purchase_price_min": <Zahl in EUR>,
  "purchase_price_max": <Zahl in EUR>,
  "avg_rent_sqm": <Zahl in EUR>,
  "rent_min": <Zahl in EUR>,
  "rent_max": <Zahl in EUR>,
  "confidence": <Zahl 0.5-1.0 basierend auf wie bekannt der Ort ist>
}`;

  const response = await claude.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 300,
    system: 'Du bist ein deutscher Immobilienmarkt-Experte. Antworte immer mit validem JSON ohne Markdown-Formatierung.',
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '';

  if (!rawContent) {
    throw new Error('Keine Antwort von Claude');
  }

  // Handle potential markdown code blocks
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
  const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
  const result = JSON.parse(jsonStr);

  return {
    plz,
    city,
    avg_purchase_price_sqm: result.avg_purchase_price_sqm,
    purchase_price_min: result.purchase_price_min,
    purchase_price_max: result.purchase_price_max,
    avg_rent_sqm: result.avg_rent_sqm,
    rent_min: result.rent_min,
    rent_max: result.rent_max,
    confidence_score: result.confidence || 0.85,
  };
}

/**
 * Estimate market data for multiple PLZ in a single API call (batch processing)
 * More cost-efficient than individual calls
 */
export async function estimateMarketDataBatch(
  plzList: PLZData[]
): Promise<PLZMarketEstimate[]> {
  if (plzList.length === 0) return [];

  const claude = getClaudeClient();

  // Build the PLZ list string
  const plzListStr = plzList
    .map((p) => `- ${p.plz}: ${p.city}, ${p.federal_state}`)
    .join('\n');

  const prompt = `Es ist DEZEMBER 2025. Du bist ein Immobilien-Marktexperte.

Schätze die AKTUELLEN Immobilienpreise für diese ${plzList.length} deutschen Postleitzahlen:

${plzListStr}

Für jede PLZ schätze:
1. Durchschnittlicher Kaufpreis/m² für Eigentumswohnungen (70-100m², nach 1990)
2. Preisspanne (min/max)
3. Durchschnittliche Kaltmiete/m²
4. Mietpreisspanne (min/max)

Berücksichtige:
- Regionale Unterschiede (Stadt vs Land)
- Wirtschaftskraft der Region
- Aktuelle Markttrends 2025

Antworte NUR mit einem JSON-Objekt (ohne Markdown):
{
  "estimates": [
    {
      "plz": "12345",
      "avg_purchase_price_sqm": 3500,
      "purchase_price_min": 2800,
      "purchase_price_max": 4200,
      "avg_rent_sqm": 12.50,
      "rent_min": 10.00,
      "rent_max": 15.00,
      "confidence": 0.9
    }
  ],
  "reasoning": "Kurze Erklärung der Schätzungen"
}`;

  const response = await claude.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    system: 'Du bist ein deutscher Immobilienmarkt-Experte. Antworte immer mit validem JSON ohne Markdown-Formatierung.',
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = response.content.find(block => block.type === 'text');
  const rawContent = textContent?.type === 'text' ? textContent.text : '';

  if (!rawContent) {
    throw new Error('Keine Antwort von Claude');
  }

  // Handle potential markdown code blocks
  const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, rawContent];
  const jsonStr = jsonMatch[1]?.trim() || rawContent.trim();
  const result: BatchEstimateResult = JSON.parse(jsonStr);

  // Map estimates back to full PLZ data
  return result.estimates.map((est) => {
    const plzData = plzList.find((p) => p.plz === est.plz);
    return {
      plz: est.plz,
      city: plzData?.city || '',
      avg_purchase_price_sqm: est.avg_purchase_price_sqm,
      purchase_price_min: est.purchase_price_min,
      purchase_price_max: est.purchase_price_max,
      avg_rent_sqm: est.avg_rent_sqm,
      rent_min: est.rent_min,
      rent_max: est.rent_max,
      confidence_score: est.confidence || 0.85,
    };
  });
}

/**
 * Update market data in the database for given PLZ
 */
export async function updateMarketDataInDB(estimates: PLZMarketEstimate[]): Promise<number> {
  let updated = 0;

  for (const est of estimates) {
    try {
      await query(
        `UPDATE plz_market_data SET
          avg_purchase_price_sqm = $2,
          purchase_price_min = $3,
          purchase_price_max = $4,
          avg_rent_sqm = $5,
          rent_min = $6,
          rent_max = $7,
          confidence_score = $8,
          data_source = 'ai_estimated',
          updated_at = NOW()
        WHERE plz = $1`,
        [
          est.plz,
          est.avg_purchase_price_sqm,
          est.purchase_price_min,
          est.purchase_price_max,
          est.avg_rent_sqm,
          est.rent_min,
          est.rent_max,
          est.confidence_score,
        ]
      );
      updated++;
    } catch (error) {
      console.error(`Error updating PLZ ${est.plz}:`, error);
    }
  }

  return updated;
}

/**
 * Save historical snapshot of market data
 */
export async function saveMarketDataSnapshot(plzList: string[]): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  for (const plz of plzList) {
    await query(
      `INSERT INTO plz_market_data_history (plz, avg_purchase_price_sqm, avg_rent_sqm, snapshot_date)
       SELECT plz, avg_purchase_price_sqm, avg_rent_sqm, $2
       FROM plz_market_data
       WHERE plz = $1
       ON CONFLICT (plz, snapshot_date) DO UPDATE SET
         avg_purchase_price_sqm = EXCLUDED.avg_purchase_price_sqm,
         avg_rent_sqm = EXCLUDED.avg_rent_sqm`,
      [plz, today]
    );
  }
}

/**
 * Get PLZ that need price estimation (no prices yet)
 */
export async function getPLZWithoutPrices(limit: number = 50): Promise<PLZData[]> {
  const rows = await query<PLZData>(
    `SELECT plz, city, district, federal_state
     FROM plz_market_data
     WHERE avg_purchase_price_sqm IS NULL
     ORDER BY city
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Get all PLZ for update (ordered by last update)
 */
export async function getAllPLZForUpdate(limit: number = 50, offset: number = 0): Promise<PLZData[]> {
  const rows = await query<PLZData>(
    `SELECT plz, city, district, federal_state
     FROM plz_market_data
     ORDER BY updated_at ASC NULLS FIRST, city
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Get market data by PLZ
 */
export async function getMarketDataByPLZ(plz: string): Promise<PLZMarketEstimate | null> {
  const rows = await query<PLZMarketEstimate & { id: string; stadtteil: string | null }>(
    `SELECT plz, city, stadtteil, avg_purchase_price_sqm, purchase_price_min, purchase_price_max,
            avg_rent_sqm, rent_min, rent_max, confidence_score, grunderwerbsteuer_rate
     FROM plz_market_data
     WHERE plz = $1`,
    [plz]
  );
  return rows[0] || null;
}

/**
 * Get market data statistics
 */
export async function getMarketDataStats(): Promise<{
  total: number;
  withPrices: number;
  withoutPrices: number;
  lastUpdate: Date | null;
  avgConfidence: number;
}> {
  const stats = await query<{
    total: string;
    with_prices: string;
    without_prices: string;
    last_update: Date | null;
    avg_confidence: string;
  }>(
    `SELECT
      COUNT(*) as total,
      COUNT(avg_purchase_price_sqm) as with_prices,
      COUNT(*) - COUNT(avg_purchase_price_sqm) as without_prices,
      MAX(updated_at) as last_update,
      COALESCE(AVG(confidence_score), 0) as avg_confidence
    FROM plz_market_data`
  );

  const row = stats[0];
  return {
    total: parseInt(row.total),
    withPrices: parseInt(row.with_prices),
    withoutPrices: parseInt(row.without_prices),
    lastUpdate: row.last_update,
    avgConfidence: parseFloat(row.avg_confidence),
  };
}
