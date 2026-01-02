/**
 * Interest Rate Extractor Service
 * Verwendet OpenAI Vision API um Zinsdaten aus ZINSUPDATE-Bildern zu extrahieren
 */

import { getOpenAIClient, buildSystemPrompt } from '../utils/openai.js';
import { query } from '../db.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('interest-rate-extractor');

// =====================================================
// TYPES
// =====================================================

export interface InterestRateMatrixEntry {
  loanToValue: number;      // 50, 70, 80, 90, 100
  fixedRateYears: number;   // 5, 10, 15, 20, 30
  interestRate: number;     // z.B. 4.25
}

export interface PropertyValueAdjustment {
  propertyValueMin: number;
  propertyValueMax: number | null;
  rateAdjustment: number;
}

export interface ExtractedInterestRateData {
  calendarWeek: number;
  year: number;
  topRate: number;
  minRate?: number;
  maxRate?: number;
  matrix: InterestRateMatrixEntry[];
  propertyValueAdjustments: PropertyValueAdjustment[];
  confidence: number;
}

export interface InterestRateUpdate {
  id: string;
  calendarWeek: number;
  year: number;
  topRate: number;
  imageUrl: string | null;
  status: string;
  extractionConfidence: number | null;
  uploadDate: Date;
  createdAt: Date;
}

export interface CurrentInterestRateResult {
  interestRate: number;
  loanToValue: number;
  fixedRateYears: number;
  propertyValue: number;
  calendarWeek: number;
  year: number;
  lastUpdated: Date | null;
}

// =====================================================
// EXTRACTION PROMPT
// =====================================================

const EXTRACTION_PROMPT = `Du analysierst ein ZINSUPDATE-Bild einer Baufinanzierungs-Webseite.

Extrahiere folgende Daten als JSON:

1. **Kalenderwoche und Jahr**: Suche nach "KW01, 2026" oder "Datum: KW01, 2026"
   -> calendarWeek: 1, year: 2026

2. **TOP-ZINS**: Der prominenteste/groesste Zinssatz (oft in einem Kasten hervorgehoben)
   - Basis: 90% Beleihung, 10 Jahre Zinsbindung, 250.000 EUR Objektwert
   - Suche auch nach Min und Max Werten

3. **Zins-Matrix nach Finanzierungsquote**:
   Tabelle mit Beleihungsquoten und zugehoerigen Zinssaetzen:
   - 100% -> z.B. 4.65%
   - 90% -> z.B. 4.25%
   - 80% -> z.B. 3.94%
   - 70% -> z.B. 3.76%
   - 50% -> z.B. 3.68%

4. **Zins-Matrix nach Zinsbindung**:
   Tabelle mit Laufzeiten und Zinssaetzen:
   - 5 Jahre -> z.B. 4.00%
   - 10 Jahre -> z.B. 4.25%
   - 15 Jahre -> z.B. 4.69%
   - 20 Jahre -> z.B. 4.98%
   - 30 Jahre -> z.B. 5.03%

5. **Objektwert-Aufschlaege**:
   Tabelle mit Objektwerten und Aufschlaegen/Abschlaegen:
   - 50.000 EUR -> z.B. +0.69%
   - 100.000 EUR -> z.B. +0.58%
   - 250.000 EUR -> 0.00% (Basis)
   - 500.000 EUR -> z.B. 0.00%
   - 1.000.000 EUR -> z.B. -0.10%

Gib NUR ein valides JSON-Objekt zurueck:
{
  "calendarWeek": number,
  "year": number,
  "topRate": number,
  "minRate": number | null,
  "maxRate": number | null,
  "matrix": [
    { "loanToValue": 50, "fixedRateYears": 10, "interestRate": 3.68 },
    { "loanToValue": 70, "fixedRateYears": 10, "interestRate": 3.76 },
    { "loanToValue": 80, "fixedRateYears": 10, "interestRate": 3.94 },
    { "loanToValue": 90, "fixedRateYears": 10, "interestRate": 4.25 },
    { "loanToValue": 100, "fixedRateYears": 10, "interestRate": 4.65 },
    { "loanToValue": 80, "fixedRateYears": 5, "interestRate": 4.00 },
    { "loanToValue": 80, "fixedRateYears": 15, "interestRate": 4.69 },
    { "loanToValue": 80, "fixedRateYears": 20, "interestRate": 4.98 },
    { "loanToValue": 80, "fixedRateYears": 30, "interestRate": 5.03 }
  ],
  "propertyValueAdjustments": [
    { "propertyValueMin": 0, "propertyValueMax": 99999, "rateAdjustment": 0.69 },
    { "propertyValueMin": 100000, "propertyValueMax": 249999, "rateAdjustment": 0.58 },
    { "propertyValueMin": 250000, "propertyValueMax": 499999, "rateAdjustment": 0.00 },
    { "propertyValueMin": 500000, "propertyValueMax": 999999, "rateAdjustment": 0.00 },
    { "propertyValueMin": 1000000, "propertyValueMax": null, "rateAdjustment": -0.10 }
  ],
  "confidence": 0.95
}

WICHTIG:
- Alle Zinssaetze als Dezimalzahlen (4.25, nicht "4,25%" oder "4.25%")
- Deutsche Dezimaltrennzeichen (Komma) in Punkt umwandeln
- Fehlende Werte NICHT raten, sondern mit sinnvollen Defaults oder null
- confidence: 0.0-1.0 basierend auf Lesbarkeit und Vollstaendigkeit
- Kombiniere Matrix-Eintraege: Fuer jede Beleihungsquote bei 10J, fuer jede Zinsbindung bei 80%`;

// =====================================================
// EXTRACTION FUNCTION
// =====================================================

export async function extractInterestRatesFromImage(
  imageBase64: string
): Promise<ExtractedInterestRateData> {
  log.info('Starting interest rate extraction from image...');

  const client = getOpenAIClient();
  const systemPrompt = buildSystemPrompt('extraction', EXTRACTION_PROMPT);

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extrahiere alle Zinsdaten aus diesem ZINSUPDATE-Bild:',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Keine Antwort von OpenAI erhalten');
  }

  log.info('OpenAI response received, parsing JSON...');

  const data = JSON.parse(content) as ExtractedInterestRateData;

  log.info(`Extracted data: KW${data.calendarWeek}/${data.year}, TOP-ZINS: ${data.topRate}%, ${data.matrix.length} matrix entries`);

  return data;
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

export async function saveInterestRateUpdate(
  data: ExtractedInterestRateData,
  imageUrl: string | null
): Promise<string> {
  log.info(`Saving interest rate update for KW${data.calendarWeek}/${data.year}...`);

  // Insert/update main record
  const updateResult = await query<{ id: string }>(
    `INSERT INTO interest_rate_updates
     (calendar_week, year, top_rate, min_rate, max_rate, image_url, raw_extracted_data, extraction_confidence, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'processed')
     ON CONFLICT (calendar_week, year)
     DO UPDATE SET
       top_rate = EXCLUDED.top_rate,
       min_rate = EXCLUDED.min_rate,
       max_rate = EXCLUDED.max_rate,
       image_url = EXCLUDED.image_url,
       raw_extracted_data = EXCLUDED.raw_extracted_data,
       extraction_confidence = EXCLUDED.extraction_confidence,
       status = 'processed',
       updated_at = NOW()
     RETURNING id`,
    [
      data.calendarWeek,
      data.year,
      data.topRate,
      data.minRate ?? null,
      data.maxRate ?? null,
      imageUrl,
      JSON.stringify(data),
      data.confidence,
    ]
  );

  const updateId = updateResult[0].id;
  log.info(`Update saved with ID: ${updateId}`);

  // Delete existing matrix entries for this update
  await query('DELETE FROM interest_rate_matrix WHERE update_id = $1', [updateId]);

  // Insert matrix entries
  for (const entry of data.matrix) {
    await query(
      `INSERT INTO interest_rate_matrix
       (update_id, loan_to_value, fixed_rate_years, interest_rate, rate_delta)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (update_id, loan_to_value, fixed_rate_years) DO UPDATE SET
         interest_rate = EXCLUDED.interest_rate,
         rate_delta = EXCLUDED.rate_delta`,
      [
        updateId,
        entry.loanToValue,
        entry.fixedRateYears,
        entry.interestRate,
        Number((entry.interestRate - data.topRate).toFixed(3)),
      ]
    );
  }
  log.info(`Saved ${data.matrix.length} matrix entries`);

  // Delete and re-insert property value adjustments
  await query('DELETE FROM interest_rate_property_value_adjustments WHERE update_id = $1', [updateId]);

  for (const adj of data.propertyValueAdjustments) {
    await query(
      `INSERT INTO interest_rate_property_value_adjustments
       (update_id, property_value_min, property_value_max, rate_adjustment)
       VALUES ($1, $2, $3, $4)`,
      [updateId, adj.propertyValueMin, adj.propertyValueMax, adj.rateAdjustment]
    );
  }
  log.info(`Saved ${data.propertyValueAdjustments.length} property value adjustments`);

  // Update history table
  // Get specific rates for the history
  const rate80 = data.matrix.find(m => m.loanToValue === 80 && m.fixedRateYears === 10)?.interestRate;
  const rate90 = data.matrix.find(m => m.loanToValue === 90 && m.fixedRateYears === 10)?.interestRate;
  const rate15y = data.matrix.find(m => m.loanToValue === 80 && m.fixedRateYears === 15)?.interestRate;

  await query(
    `INSERT INTO interest_rate_history
     (calendar_week, year, snapshot_date, top_rate, avg_rate_10y_80pct, avg_rate_10y_90pct, avg_rate_15y_80pct)
     VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6)
     ON CONFLICT (calendar_week, year) DO UPDATE SET
       top_rate = EXCLUDED.top_rate,
       avg_rate_10y_80pct = EXCLUDED.avg_rate_10y_80pct,
       avg_rate_10y_90pct = EXCLUDED.avg_rate_10y_90pct,
       avg_rate_15y_80pct = EXCLUDED.avg_rate_15y_80pct`,
    [data.calendarWeek, data.year, data.topRate, rate80 ?? null, rate90 ?? null, rate15y ?? null]
  );
  log.info('Updated history table');

  return updateId;
}

export async function getCurrentInterestRate(
  loanToValue: number = 80,
  fixedRateYears: number = 10,
  propertyValue: number = 250000
): Promise<CurrentInterestRateResult | null> {
  // Get latest update
  const latestUpdate = await query<{
    id: string;
    top_rate: string;
    calendar_week: number;
    year: number;
    upload_date: Date;
  }>(
    `SELECT id, top_rate, calendar_week, year, upload_date
     FROM interest_rate_updates
     WHERE status = 'processed'
     ORDER BY year DESC, calendar_week DESC
     LIMIT 1`
  );

  if (latestUpdate.length === 0) {
    return null;
  }

  const update = latestUpdate[0];
  const updateId = update.id;

  // Get base rate from matrix
  const matrixResult = await query<{ interest_rate: string }>(
    `SELECT interest_rate FROM interest_rate_matrix
     WHERE update_id = $1
       AND loan_to_value = $2
       AND fixed_rate_years = $3`,
    [updateId, loanToValue, fixedRateYears]
  );

  let baseRate: number;

  if (matrixResult.length > 0) {
    baseRate = Number(matrixResult[0].interest_rate);
  } else {
    // Fallback: Try to find closest match or use top_rate
    const closestMatrix = await query<{ interest_rate: string }>(
      `SELECT interest_rate FROM interest_rate_matrix
       WHERE update_id = $1
       ORDER BY ABS(loan_to_value - $2) + ABS(fixed_rate_years - $3)
       LIMIT 1`,
      [updateId, loanToValue, fixedRateYears]
    );

    baseRate = closestMatrix.length > 0
      ? Number(closestMatrix[0].interest_rate)
      : Number(update.top_rate);
  }

  // Get property value adjustment
  const adjustmentResult = await query<{ rate_adjustment: string }>(
    `SELECT rate_adjustment FROM interest_rate_property_value_adjustments
     WHERE update_id = $1
       AND property_value_min <= $2
       AND (property_value_max IS NULL OR property_value_max >= $2)
     ORDER BY property_value_min DESC
     LIMIT 1`,
    [updateId, propertyValue]
  );

  if (adjustmentResult.length > 0) {
    baseRate += Number(adjustmentResult[0].rate_adjustment);
  }

  return {
    interestRate: Number(baseRate.toFixed(3)),
    loanToValue,
    fixedRateYears,
    propertyValue,
    calendarWeek: update.calendar_week,
    year: update.year,
    lastUpdated: update.upload_date,
  };
}

export async function getInterestRateHistory(weeks: number = 10): Promise<{
  calendarWeek: number;
  year: number;
  snapshotDate: Date;
  topRate: number;
  avgRate10y80pct: number | null;
  avgRate10y90pct: number | null;
}[]> {
  const result = await query<{
    calendar_week: number;
    year: number;
    snapshot_date: Date;
    top_rate: string;
    avg_rate_10y_80pct: string | null;
    avg_rate_10y_90pct: string | null;
  }>(
    `SELECT calendar_week, year, snapshot_date, top_rate, avg_rate_10y_80pct, avg_rate_10y_90pct
     FROM interest_rate_history
     ORDER BY year DESC, calendar_week DESC
     LIMIT $1`,
    [weeks]
  );

  return result.map(row => ({
    calendarWeek: row.calendar_week,
    year: row.year,
    snapshotDate: row.snapshot_date,
    topRate: Number(row.top_rate),
    avgRate10y80pct: row.avg_rate_10y_80pct ? Number(row.avg_rate_10y_80pct) : null,
    avgRate10y90pct: row.avg_rate_10y_90pct ? Number(row.avg_rate_10y_90pct) : null,
  }));
}

export async function getInterestRateMatrix(updateId?: string): Promise<{
  update: {
    id: string;
    calendarWeek: number;
    year: number;
    topRate: number;
    uploadDate: Date;
    extractionConfidence: number | null;
  } | null;
  matrix: InterestRateMatrixEntry[];
  propertyValueAdjustments: PropertyValueAdjustment[];
}> {
  // Get latest or specific update
  let updateQuery = `
    SELECT id, calendar_week, year, top_rate, upload_date, extraction_confidence
    FROM interest_rate_updates
    WHERE status = 'processed'
  `;
  const params: any[] = [];

  if (updateId) {
    updateQuery += ' AND id = $1';
    params.push(updateId);
  } else {
    updateQuery += ' ORDER BY year DESC, calendar_week DESC LIMIT 1';
  }

  const updateResult = await query<{
    id: string;
    calendar_week: number;
    year: number;
    top_rate: string;
    upload_date: Date;
    extraction_confidence: string | null;
  }>(updateQuery, params);

  if (updateResult.length === 0) {
    return { update: null, matrix: [], propertyValueAdjustments: [] };
  }

  const update = updateResult[0];

  // Get matrix
  const matrixResult = await query<{
    loan_to_value: number;
    fixed_rate_years: number;
    interest_rate: string;
    rate_delta: string | null;
  }>(
    `SELECT loan_to_value, fixed_rate_years, interest_rate, rate_delta
     FROM interest_rate_matrix
     WHERE update_id = $1
     ORDER BY loan_to_value, fixed_rate_years`,
    [update.id]
  );

  // Get adjustments
  const adjustmentsResult = await query<{
    property_value_min: number;
    property_value_max: number | null;
    rate_adjustment: string;
  }>(
    `SELECT property_value_min, property_value_max, rate_adjustment
     FROM interest_rate_property_value_adjustments
     WHERE update_id = $1
     ORDER BY property_value_min`,
    [update.id]
  );

  return {
    update: {
      id: update.id,
      calendarWeek: update.calendar_week,
      year: update.year,
      topRate: Number(update.top_rate),
      uploadDate: update.upload_date,
      extractionConfidence: update.extraction_confidence ? Number(update.extraction_confidence) : null,
    },
    matrix: matrixResult.map(row => ({
      loanToValue: row.loan_to_value,
      fixedRateYears: row.fixed_rate_years,
      interestRate: Number(row.interest_rate),
    })),
    propertyValueAdjustments: adjustmentsResult.map(row => ({
      propertyValueMin: row.property_value_min,
      propertyValueMax: row.property_value_max,
      rateAdjustment: Number(row.rate_adjustment),
    })),
  };
}

export async function listInterestRateUpdates(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  updates: InterestRateUpdate[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}> {
  const offset = (page - 1) * pageSize;

  const countResult = await query<{ total: number }>(
    'SELECT COUNT(*)::int as total FROM interest_rate_updates'
  );
  const total = countResult[0]?.total || 0;

  const updates = await query<{
    id: string;
    calendar_week: number;
    year: number;
    top_rate: string;
    image_url: string | null;
    status: string;
    extraction_confidence: string | null;
    upload_date: Date;
    created_at: Date;
  }>(
    `SELECT id, calendar_week, year, top_rate, image_url, status,
            extraction_confidence, upload_date, created_at
     FROM interest_rate_updates
     ORDER BY year DESC, calendar_week DESC
     LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );

  return {
    updates: updates.map(row => ({
      id: row.id,
      calendarWeek: row.calendar_week,
      year: row.year,
      topRate: Number(row.top_rate),
      imageUrl: row.image_url,
      status: row.status,
      extractionConfidence: row.extraction_confidence ? Number(row.extraction_confidence) : null,
      uploadDate: row.upload_date,
      createdAt: row.created_at,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
