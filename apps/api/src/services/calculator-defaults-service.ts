/**
 * Calculator Defaults Service
 *
 * Verwaltet globale Berechnungs-Standardwerte und User-spezifische Überschreibungen.
 * Verwendet Caching für globale Defaults um Datenbankabfragen zu minimieren.
 */

import { query, queryOne } from '../db.js';

// ============================================
// Types
// ============================================

export interface CalculatorDefaults {
  id: string;
  buildingRatioStandard: number;
  buildingRatioNeubau: number;
  maintenanceCostPerSqm: number;
  nonAllocableHausgeldRatio: number;
  costIncreaseRate: number;
  rentIncreaseRate: number;
  valueAppreciationRate: number;
  hausgeldPerSqmModern: number;
  hausgeldPerSqmOld: number;
  equityPercentage: number;
  amortizationRate: number;
  isActive: boolean;
  changedBy: string | null;
  changeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserCalculatorPreferences {
  id: string;
  userId: string;
  buildingRatio: number | null;
  maintenanceCostPerSqm: number | null;
  nonAllocableHausgeldRatio: number | null;
  costIncreaseRate: number | null;
  rentIncreaseRate: number | null;
  valueAppreciationRate: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EffectiveDefaults {
  buildingRatioStandard: number;
  buildingRatioNeubau: number;
  maintenanceCostPerSqm: number;
  nonAllocableHausgeldRatio: number;
  costIncreaseRate: number;
  rentIncreaseRate: number;
  valueAppreciationRate: number;
  hausgeldPerSqmModern: number;
  hausgeldPerSqmOld: number;
  equityPercentage: number;
  amortizationRate: number;
  source: 'global' | 'user_override';
  overriddenFields: string[];
}

export interface CalculatorDefaultsHistory {
  id: string;
  defaultsId: string;
  buildingRatioStandard: number | null;
  buildingRatioNeubau: number | null;
  maintenanceCostPerSqm: number | null;
  nonAllocableHausgeldRatio: number | null;
  costIncreaseRate: number | null;
  rentIncreaseRate: number | null;
  valueAppreciationRate: number | null;
  hausgeldPerSqmModern: number | null;
  hausgeldPerSqmOld: number | null;
  equityPercentage: number | null;
  amortizationRate: number | null;
  changedBy: string;
  changeReason: string | null;
  changedAt: string;
}

// ============================================
// Fallback Defaults (wenn DB leer)
// ============================================

const FALLBACK_DEFAULTS: Omit<CalculatorDefaults, 'id' | 'isActive' | 'changedBy' | 'changeReason' | 'createdAt' | 'updatedAt'> = {
  buildingRatioStandard: 0.80,
  buildingRatioNeubau: 0.85,
  maintenanceCostPerSqm: 10.00,
  nonAllocableHausgeldRatio: 0.30,
  costIncreaseRate: 0.02,
  rentIncreaseRate: 0.03,
  valueAppreciationRate: 0.02,
  hausgeldPerSqmModern: 2.50,
  hausgeldPerSqmOld: 3.50,
  equityPercentage: 20.00,
  amortizationRate: 1.00,
};

// ============================================
// Cache für globale Defaults
// ============================================

let cachedDefaults: CalculatorDefaults | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60000; // 1 Minute Cache

function isCacheValid(): boolean {
  return cachedDefaults !== null && (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

export function invalidateCache(): void {
  cachedDefaults = null;
  cacheTimestamp = 0;
}

// ============================================
// Database Row Mapping
// ============================================

function mapRowToDefaults(row: any): CalculatorDefaults {
  return {
    id: row.id,
    buildingRatioStandard: parseFloat(row.building_ratio_standard),
    buildingRatioNeubau: parseFloat(row.building_ratio_neubau),
    maintenanceCostPerSqm: parseFloat(row.maintenance_cost_per_sqm),
    nonAllocableHausgeldRatio: parseFloat(row.non_allocable_hausgeld_ratio),
    costIncreaseRate: parseFloat(row.cost_increase_rate),
    rentIncreaseRate: parseFloat(row.rent_increase_rate),
    valueAppreciationRate: parseFloat(row.value_appreciation_rate),
    hausgeldPerSqmModern: parseFloat(row.hausgeld_per_sqm_modern),
    hausgeldPerSqmOld: parseFloat(row.hausgeld_per_sqm_old),
    equityPercentage: parseFloat(row.equity_percentage),
    amortizationRate: parseFloat(row.amortization_rate),
    isActive: row.is_active,
    changedBy: row.changed_by,
    changeReason: row.change_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToUserPreferences(row: any): UserCalculatorPreferences {
  return {
    id: row.id,
    userId: row.user_id,
    buildingRatio: row.building_ratio ? parseFloat(row.building_ratio) : null,
    maintenanceCostPerSqm: row.maintenance_cost_per_sqm ? parseFloat(row.maintenance_cost_per_sqm) : null,
    nonAllocableHausgeldRatio: row.non_allocable_hausgeld_ratio ? parseFloat(row.non_allocable_hausgeld_ratio) : null,
    costIncreaseRate: row.cost_increase_rate ? parseFloat(row.cost_increase_rate) : null,
    rentIncreaseRate: row.rent_increase_rate ? parseFloat(row.rent_increase_rate) : null,
    valueAppreciationRate: row.value_appreciation_rate ? parseFloat(row.value_appreciation_rate) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToHistory(row: any): CalculatorDefaultsHistory {
  return {
    id: row.id,
    defaultsId: row.defaults_id,
    buildingRatioStandard: row.building_ratio_standard ? parseFloat(row.building_ratio_standard) : null,
    buildingRatioNeubau: row.building_ratio_neubau ? parseFloat(row.building_ratio_neubau) : null,
    maintenanceCostPerSqm: row.maintenance_cost_per_sqm ? parseFloat(row.maintenance_cost_per_sqm) : null,
    nonAllocableHausgeldRatio: row.non_allocable_hausgeld_ratio ? parseFloat(row.non_allocable_hausgeld_ratio) : null,
    costIncreaseRate: row.cost_increase_rate ? parseFloat(row.cost_increase_rate) : null,
    rentIncreaseRate: row.rent_increase_rate ? parseFloat(row.rent_increase_rate) : null,
    valueAppreciationRate: row.value_appreciation_rate ? parseFloat(row.value_appreciation_rate) : null,
    hausgeldPerSqmModern: row.hausgeld_per_sqm_modern ? parseFloat(row.hausgeld_per_sqm_modern) : null,
    hausgeldPerSqmOld: row.hausgeld_per_sqm_old ? parseFloat(row.hausgeld_per_sqm_old) : null,
    equityPercentage: row.equity_percentage ? parseFloat(row.equity_percentage) : null,
    amortizationRate: row.amortization_rate ? parseFloat(row.amortization_rate) : null,
    changedBy: row.changed_by,
    changeReason: row.change_reason,
    changedAt: row.changed_at,
  };
}

// ============================================
// Global Defaults Functions
// ============================================

/**
 * Lädt die globalen Standardwerte (mit Caching)
 */
export async function getGlobalDefaults(): Promise<CalculatorDefaults> {
  // Cache prüfen
  if (isCacheValid() && cachedDefaults) {
    return cachedDefaults;
  }

  const row = await queryOne<any>(
    `SELECT * FROM calculator_defaults WHERE is_active = true LIMIT 1`
  );

  if (!row) {
    // Fallback wenn keine Daten in DB
    console.warn('[CalculatorDefaults] No active defaults found, using fallback values');
    return {
      id: 'fallback',
      ...FALLBACK_DEFAULTS,
      isActive: true,
      changedBy: null,
      changeReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  cachedDefaults = mapRowToDefaults(row);
  cacheTimestamp = Date.now();

  return cachedDefaults;
}

/**
 * Aktualisiert die globalen Standardwerte (für Admin)
 */
export async function updateGlobalDefaults(
  updates: Partial<Omit<CalculatorDefaults, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>>,
  changedBy: string,
  changeReason: string
): Promise<CalculatorDefaults> {
  const current = await getGlobalDefaults();

  const result = await queryOne<any>(
    `UPDATE calculator_defaults
     SET
       building_ratio_standard = COALESCE($1, building_ratio_standard),
       building_ratio_neubau = COALESCE($2, building_ratio_neubau),
       maintenance_cost_per_sqm = COALESCE($3, maintenance_cost_per_sqm),
       non_allocable_hausgeld_ratio = COALESCE($4, non_allocable_hausgeld_ratio),
       cost_increase_rate = COALESCE($5, cost_increase_rate),
       rent_increase_rate = COALESCE($6, rent_increase_rate),
       value_appreciation_rate = COALESCE($7, value_appreciation_rate),
       hausgeld_per_sqm_modern = COALESCE($8, hausgeld_per_sqm_modern),
       hausgeld_per_sqm_old = COALESCE($9, hausgeld_per_sqm_old),
       equity_percentage = COALESCE($10, equity_percentage),
       amortization_rate = COALESCE($11, amortization_rate),
       changed_by = $12,
       change_reason = $13,
       updated_at = NOW()
     WHERE is_active = true
     RETURNING *`,
    [
      updates.buildingRatioStandard,
      updates.buildingRatioNeubau,
      updates.maintenanceCostPerSqm,
      updates.nonAllocableHausgeldRatio,
      updates.costIncreaseRate,
      updates.rentIncreaseRate,
      updates.valueAppreciationRate,
      updates.hausgeldPerSqmModern,
      updates.hausgeldPerSqmOld,
      updates.equityPercentage,
      updates.amortizationRate,
      changedBy,
      changeReason,
    ]
  );

  // Cache invalidieren
  invalidateCache();

  if (!result) {
    throw new Error('Failed to update calculator defaults');
  }

  return mapRowToDefaults(result);
}

/**
 * Lädt die Änderungshistorie der globalen Defaults
 */
export async function getDefaultsHistory(
  limit: number = 20,
  offset: number = 0
): Promise<{ history: CalculatorDefaultsHistory[]; total: number }> {
  const [rows, countResult] = await Promise.all([
    query<any>(
      `SELECT * FROM calculator_defaults_history
       ORDER BY changed_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM calculator_defaults_history`
    ),
  ]);

  return {
    history: rows.map(mapRowToHistory),
    total: parseInt(countResult?.count || '0'),
  };
}

// ============================================
// User Preferences Functions
// ============================================

/**
 * Lädt die User-spezifischen Überschreibungen
 */
export async function getUserPreferences(userId: string): Promise<UserCalculatorPreferences | null> {
  const row = await queryOne<any>(
    `SELECT * FROM user_calculator_preferences WHERE user_id = $1`,
    [userId]
  );

  if (!row) {
    return null;
  }

  return mapRowToUserPreferences(row);
}

/**
 * Aktualisiert oder erstellt User-Überschreibungen
 */
export async function upsertUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserCalculatorPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<UserCalculatorPreferences> {
  const result = await queryOne<any>(
    `INSERT INTO user_calculator_preferences (
       user_id,
       building_ratio,
       maintenance_cost_per_sqm,
       non_allocable_hausgeld_ratio,
       cost_increase_rate,
       rent_increase_rate,
       value_appreciation_rate
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       building_ratio = COALESCE($2, user_calculator_preferences.building_ratio),
       maintenance_cost_per_sqm = COALESCE($3, user_calculator_preferences.maintenance_cost_per_sqm),
       non_allocable_hausgeld_ratio = COALESCE($4, user_calculator_preferences.non_allocable_hausgeld_ratio),
       cost_increase_rate = COALESCE($5, user_calculator_preferences.cost_increase_rate),
       rent_increase_rate = COALESCE($6, user_calculator_preferences.rent_increase_rate),
       value_appreciation_rate = COALESCE($7, user_calculator_preferences.value_appreciation_rate),
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      preferences.buildingRatio,
      preferences.maintenanceCostPerSqm,
      preferences.nonAllocableHausgeldRatio,
      preferences.costIncreaseRate,
      preferences.rentIncreaseRate,
      preferences.valueAppreciationRate,
    ]
  );

  if (!result) {
    throw new Error('Failed to upsert user calculator preferences');
  }

  return mapRowToUserPreferences(result);
}

/**
 * Setzt User-Überschreibungen auf globale Defaults zurück
 */
export async function resetUserPreferences(userId: string): Promise<void> {
  await query(
    `DELETE FROM user_calculator_preferences WHERE user_id = $1`,
    [userId]
  );
}

// ============================================
// Effective Defaults (Merged)
// ============================================

/**
 * Liefert die effektiven Defaults für einen User
 * Merged globale Defaults mit User-Überschreibungen
 */
export async function getEffectiveDefaults(userId?: string): Promise<EffectiveDefaults> {
  const globalDefaults = await getGlobalDefaults();

  // Ohne User-ID: nur globale Defaults
  if (!userId) {
    return {
      buildingRatioStandard: globalDefaults.buildingRatioStandard,
      buildingRatioNeubau: globalDefaults.buildingRatioNeubau,
      maintenanceCostPerSqm: globalDefaults.maintenanceCostPerSqm,
      nonAllocableHausgeldRatio: globalDefaults.nonAllocableHausgeldRatio,
      costIncreaseRate: globalDefaults.costIncreaseRate,
      rentIncreaseRate: globalDefaults.rentIncreaseRate,
      valueAppreciationRate: globalDefaults.valueAppreciationRate,
      hausgeldPerSqmModern: globalDefaults.hausgeldPerSqmModern,
      hausgeldPerSqmOld: globalDefaults.hausgeldPerSqmOld,
      equityPercentage: globalDefaults.equityPercentage,
      amortizationRate: globalDefaults.amortizationRate,
      source: 'global',
      overriddenFields: [],
    };
  }

  const userPrefs = await getUserPreferences(userId);

  // Ohne User-Preferences: nur globale Defaults
  if (!userPrefs) {
    return {
      buildingRatioStandard: globalDefaults.buildingRatioStandard,
      buildingRatioNeubau: globalDefaults.buildingRatioNeubau,
      maintenanceCostPerSqm: globalDefaults.maintenanceCostPerSqm,
      nonAllocableHausgeldRatio: globalDefaults.nonAllocableHausgeldRatio,
      costIncreaseRate: globalDefaults.costIncreaseRate,
      rentIncreaseRate: globalDefaults.rentIncreaseRate,
      valueAppreciationRate: globalDefaults.valueAppreciationRate,
      hausgeldPerSqmModern: globalDefaults.hausgeldPerSqmModern,
      hausgeldPerSqmOld: globalDefaults.hausgeldPerSqmOld,
      equityPercentage: globalDefaults.equityPercentage,
      amortizationRate: globalDefaults.amortizationRate,
      source: 'global',
      overriddenFields: [],
    };
  }

  // Merge: User-Werte überschreiben globale Defaults
  const overriddenFields: string[] = [];

  if (userPrefs.buildingRatio !== null) overriddenFields.push('buildingRatio');
  if (userPrefs.maintenanceCostPerSqm !== null) overriddenFields.push('maintenanceCostPerSqm');
  if (userPrefs.nonAllocableHausgeldRatio !== null) overriddenFields.push('nonAllocableHausgeldRatio');
  if (userPrefs.costIncreaseRate !== null) overriddenFields.push('costIncreaseRate');
  if (userPrefs.rentIncreaseRate !== null) overriddenFields.push('rentIncreaseRate');
  if (userPrefs.valueAppreciationRate !== null) overriddenFields.push('valueAppreciationRate');

  return {
    // Building ratio: User hat nur einen Wert, gilt für beides wenn gesetzt
    buildingRatioStandard: userPrefs.buildingRatio ?? globalDefaults.buildingRatioStandard,
    buildingRatioNeubau: userPrefs.buildingRatio ?? globalDefaults.buildingRatioNeubau,
    maintenanceCostPerSqm: userPrefs.maintenanceCostPerSqm ?? globalDefaults.maintenanceCostPerSqm,
    nonAllocableHausgeldRatio: userPrefs.nonAllocableHausgeldRatio ?? globalDefaults.nonAllocableHausgeldRatio,
    costIncreaseRate: userPrefs.costIncreaseRate ?? globalDefaults.costIncreaseRate,
    rentIncreaseRate: userPrefs.rentIncreaseRate ?? globalDefaults.rentIncreaseRate,
    valueAppreciationRate: userPrefs.valueAppreciationRate ?? globalDefaults.valueAppreciationRate,
    // Hausgeld pro m² nur global (User überschreibt nicht)
    hausgeldPerSqmModern: globalDefaults.hausgeldPerSqmModern,
    hausgeldPerSqmOld: globalDefaults.hausgeldPerSqmOld,
    // Equity und Tilgung nur global (User überschreibt nicht)
    equityPercentage: globalDefaults.equityPercentage,
    amortizationRate: globalDefaults.amortizationRate,
    source: overriddenFields.length > 0 ? 'user_override' : 'global',
    overriddenFields,
  };
}

// ============================================
// Hilfsfunktionen für Berechnungen
// ============================================

/**
 * Gibt den passenden Gebäudeanteil basierend auf Baujahr zurück
 */
export function getBuildingRatioForYear(
  defaults: EffectiveDefaults,
  yearBuilt?: number
): number {
  if (!yearBuilt) return defaults.buildingRatioStandard;
  if (yearBuilt >= 2024) return defaults.buildingRatioNeubau;
  return defaults.buildingRatioStandard;
}

/**
 * Gibt das passende Hausgeld pro m² basierend auf Baujahr zurück
 */
export function getHausgeldPerSqmForYear(
  defaults: EffectiveDefaults,
  yearBuilt?: number
): number {
  if (!yearBuilt) return defaults.hausgeldPerSqmOld;
  if (yearBuilt >= 1980) return defaults.hausgeldPerSqmModern;
  return defaults.hausgeldPerSqmOld;
}

/**
 * Berechnet monatliche Instandhaltungskosten basierend auf m²
 */
export function calculateMonthlyMaintenanceCost(
  defaults: EffectiveDefaults,
  sqm: number
): number {
  return Math.ceil((sqm * defaults.maintenanceCostPerSqm) / 12);
}

/**
 * Berechnet nicht-umlagefähiges Hausgeld
 */
export function calculateNonAllocableHausgeld(
  defaults: EffectiveDefaults,
  totalHausgeld: number
): number {
  return Math.ceil(totalHausgeld * defaults.nonAllocableHausgeldRatio);
}
