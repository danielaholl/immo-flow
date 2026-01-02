-- Migration 055: Calculator Defaults
-- Zentrale Speicherung von Berechnungs-Standardwerten mit Admin-Verwaltung und User-Overrides

-- ============================================
-- Table 1: calculator_defaults (Globale Defaults)
-- ============================================
-- Speichert systemweite Standardwerte für alle Berechnungen
-- Wird von Admins über die Admin-Oberfläche verwaltet

CREATE TABLE IF NOT EXISTS calculator_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Gebäudeanteil für AfA-Berechnung
  building_ratio_standard DECIMAL(4,3) NOT NULL DEFAULT 0.80,  -- 80% Standard
  building_ratio_neubau DECIMAL(4,3) NOT NULL DEFAULT 0.85,    -- 85% für Neubauten (ab 2024)

  -- Instandhaltungskosten (EUR pro m² pro Jahr)
  maintenance_cost_per_sqm DECIMAL(6,2) NOT NULL DEFAULT 10.00,  -- 10 EUR/m²/Jahr

  -- Hausgeld-Aufteilung
  non_allocable_hausgeld_ratio DECIMAL(4,3) NOT NULL DEFAULT 0.30,  -- 30% nicht umlagefähig

  -- Jährliche Steigerungsraten
  cost_increase_rate DECIMAL(4,3) NOT NULL DEFAULT 0.02,       -- 2% Kostensteigerung p.a.
  rent_increase_rate DECIMAL(4,3) NOT NULL DEFAULT 0.03,       -- 3% Mietsteigerung p.a.
  value_appreciation_rate DECIMAL(4,3) NOT NULL DEFAULT 0.02,  -- 2% Wertsteigerung p.a.

  -- Standard-Hausgeld pro m² (für Schätzungen wenn nicht angegeben)
  hausgeld_per_sqm_modern DECIMAL(5,2) NOT NULL DEFAULT 2.50,  -- Moderne Gebäude (ab 1980)
  hausgeld_per_sqm_old DECIMAL(5,2) NOT NULL DEFAULT 3.50,     -- Altbauten (vor 1980)

  -- Verwaltung
  is_active BOOLEAN NOT NULL DEFAULT true,
  changed_by TEXT,
  change_reason TEXT,

  -- Zeitstempel
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kommentare für Dokumentation
COMMENT ON TABLE calculator_defaults IS 'Globale Standardwerte für alle Rendite- und Steuerberechnungen';
COMMENT ON COLUMN calculator_defaults.building_ratio_standard IS 'Gebäudeanteil vom Kaufpreis für AfA (Standard: 80%)';
COMMENT ON COLUMN calculator_defaults.building_ratio_neubau IS 'Gebäudeanteil für Neubauten ab 2024 (Standard: 85%)';
COMMENT ON COLUMN calculator_defaults.maintenance_cost_per_sqm IS 'Instandhaltungskosten in EUR pro m² pro Jahr';
COMMENT ON COLUMN calculator_defaults.non_allocable_hausgeld_ratio IS 'Anteil des Hausgeldes der nicht auf Mieter umlegbar ist';
COMMENT ON COLUMN calculator_defaults.cost_increase_rate IS 'Jährliche Kostensteigerung für Prognosen';
COMMENT ON COLUMN calculator_defaults.rent_increase_rate IS 'Jährliche Mietsteigerung für Prognosen';
COMMENT ON COLUMN calculator_defaults.value_appreciation_rate IS 'Jährliche Wertsteigerung für Prognosen';
COMMENT ON COLUMN calculator_defaults.hausgeld_per_sqm_modern IS 'Geschätztes Hausgeld pro m² für moderne Gebäude (ab 1980)';
COMMENT ON COLUMN calculator_defaults.hausgeld_per_sqm_old IS 'Geschätztes Hausgeld pro m² für Altbauten (vor 1980)';

-- Index für aktive Defaults
CREATE INDEX IF NOT EXISTS idx_calculator_defaults_active ON calculator_defaults(is_active) WHERE is_active = true;

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_calculator_defaults_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_calculator_defaults_timestamp ON calculator_defaults;
CREATE TRIGGER trigger_update_calculator_defaults_timestamp
  BEFORE UPDATE ON calculator_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_calculator_defaults_timestamp();

-- Initial-Datensatz einfügen (falls noch nicht vorhanden)
INSERT INTO calculator_defaults (
  building_ratio_standard,
  building_ratio_neubau,
  maintenance_cost_per_sqm,
  non_allocable_hausgeld_ratio,
  cost_increase_rate,
  rent_increase_rate,
  value_appreciation_rate,
  hausgeld_per_sqm_modern,
  hausgeld_per_sqm_old,
  is_active,
  changed_by,
  change_reason
) VALUES (
  0.80,
  0.85,
  10.00,
  0.30,
  0.02,
  0.03,
  0.02,
  2.50,
  3.50,
  true,
  'System',
  'Initiale Standardwerte'
) ON CONFLICT DO NOTHING;


-- ============================================
-- Table 2: calculator_defaults_history (Audit Trail)
-- ============================================
-- Speichert alle Änderungen an den globalen Defaults für Nachvollziehbarkeit

CREATE TABLE IF NOT EXISTS calculator_defaults_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defaults_id UUID NOT NULL REFERENCES calculator_defaults(id) ON DELETE CASCADE,

  -- Snapshot der Werte zum Änderungszeitpunkt
  building_ratio_standard DECIMAL(4,3),
  building_ratio_neubau DECIMAL(4,3),
  maintenance_cost_per_sqm DECIMAL(6,2),
  non_allocable_hausgeld_ratio DECIMAL(4,3),
  cost_increase_rate DECIMAL(4,3),
  rent_increase_rate DECIMAL(4,3),
  value_appreciation_rate DECIMAL(4,3),
  hausgeld_per_sqm_modern DECIMAL(5,2),
  hausgeld_per_sqm_old DECIMAL(5,2),

  -- Änderungsmetadaten
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE calculator_defaults_history IS 'Audit Trail für Änderungen an den globalen Rechner-Standardwerten';

-- Index für schnelle History-Abfragen
CREATE INDEX IF NOT EXISTS idx_calculator_defaults_history_defaults_id ON calculator_defaults_history(defaults_id);
CREATE INDEX IF NOT EXISTS idx_calculator_defaults_history_changed_at ON calculator_defaults_history(changed_at DESC);

-- Trigger zum automatischen Erstellen von History-Einträgen
CREATE OR REPLACE FUNCTION log_calculator_defaults_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO calculator_defaults_history (
      defaults_id,
      building_ratio_standard,
      building_ratio_neubau,
      maintenance_cost_per_sqm,
      non_allocable_hausgeld_ratio,
      cost_increase_rate,
      rent_increase_rate,
      value_appreciation_rate,
      hausgeld_per_sqm_modern,
      hausgeld_per_sqm_old,
      changed_by,
      change_reason
    ) VALUES (
      OLD.id,
      OLD.building_ratio_standard,
      OLD.building_ratio_neubau,
      OLD.maintenance_cost_per_sqm,
      OLD.non_allocable_hausgeld_ratio,
      OLD.cost_increase_rate,
      OLD.rent_increase_rate,
      OLD.value_appreciation_rate,
      OLD.hausgeld_per_sqm_modern,
      OLD.hausgeld_per_sqm_old,
      COALESCE(NEW.changed_by, 'Unknown'),
      NEW.change_reason
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_calculator_defaults_changes ON calculator_defaults;
CREATE TRIGGER trigger_log_calculator_defaults_changes
  AFTER UPDATE ON calculator_defaults
  FOR EACH ROW
  EXECUTE FUNCTION log_calculator_defaults_changes();


-- ============================================
-- Table 3: user_calculator_preferences (User Overrides)
-- ============================================
-- Erlaubt Benutzern, eigene Standardwerte für ihre Berechnungen zu definieren
-- NULL-Werte bedeuten: Globale Defaults verwenden

CREATE TABLE IF NOT EXISTS user_calculator_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- User kann beliebige Werte überschreiben (NULL = globalen Default nutzen)
  building_ratio DECIMAL(4,3),
  maintenance_cost_per_sqm DECIMAL(6,2),
  non_allocable_hausgeld_ratio DECIMAL(4,3),
  cost_increase_rate DECIMAL(4,3),
  rent_increase_rate DECIMAL(4,3),
  value_appreciation_rate DECIMAL(4,3),

  -- Zeitstempel
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ein Datensatz pro User
  CONSTRAINT user_calculator_preferences_user_id_unique UNIQUE(user_id)
);

COMMENT ON TABLE user_calculator_preferences IS 'Benutzerspezifische Überschreibungen der globalen Rechner-Standardwerte';
COMMENT ON COLUMN user_calculator_preferences.building_ratio IS 'Überschreibung für Gebäudeanteil (NULL = globaler Default)';
COMMENT ON COLUMN user_calculator_preferences.maintenance_cost_per_sqm IS 'Überschreibung für Instandhaltungskosten EUR/m²/Jahr';
COMMENT ON COLUMN user_calculator_preferences.non_allocable_hausgeld_ratio IS 'Überschreibung für nicht-umlagefähigen Hausgeld-Anteil';
COMMENT ON COLUMN user_calculator_preferences.cost_increase_rate IS 'Überschreibung für jährliche Kostensteigerung';
COMMENT ON COLUMN user_calculator_preferences.rent_increase_rate IS 'Überschreibung für jährliche Mietsteigerung';
COMMENT ON COLUMN user_calculator_preferences.value_appreciation_rate IS 'Überschreibung für jährliche Wertsteigerung';

-- Index für schnellen User-Lookup
CREATE INDEX IF NOT EXISTS idx_user_calculator_preferences_user_id ON user_calculator_preferences(user_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_user_calculator_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_calculator_preferences_timestamp ON user_calculator_preferences;
CREATE TRIGGER trigger_update_user_calculator_preferences_timestamp
  BEFORE UPDATE ON user_calculator_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_calculator_preferences_timestamp();


-- ============================================
-- Validation Constraints
-- ============================================
-- Stellt sicher, dass alle Werte in sinnvollen Bereichen liegen

ALTER TABLE calculator_defaults
  ADD CONSTRAINT chk_building_ratio_standard CHECK (building_ratio_standard > 0 AND building_ratio_standard <= 1),
  ADD CONSTRAINT chk_building_ratio_neubau CHECK (building_ratio_neubau > 0 AND building_ratio_neubau <= 1),
  ADD CONSTRAINT chk_maintenance_cost CHECK (maintenance_cost_per_sqm >= 0),
  ADD CONSTRAINT chk_non_allocable_ratio CHECK (non_allocable_hausgeld_ratio >= 0 AND non_allocable_hausgeld_ratio <= 1),
  ADD CONSTRAINT chk_cost_increase CHECK (cost_increase_rate >= 0 AND cost_increase_rate <= 0.5),
  ADD CONSTRAINT chk_rent_increase CHECK (rent_increase_rate >= 0 AND rent_increase_rate <= 0.5),
  ADD CONSTRAINT chk_value_appreciation CHECK (value_appreciation_rate >= -0.2 AND value_appreciation_rate <= 0.5),
  ADD CONSTRAINT chk_hausgeld_modern CHECK (hausgeld_per_sqm_modern >= 0),
  ADD CONSTRAINT chk_hausgeld_old CHECK (hausgeld_per_sqm_old >= 0);

ALTER TABLE user_calculator_preferences
  ADD CONSTRAINT chk_user_building_ratio CHECK (building_ratio IS NULL OR (building_ratio > 0 AND building_ratio <= 1)),
  ADD CONSTRAINT chk_user_maintenance_cost CHECK (maintenance_cost_per_sqm IS NULL OR maintenance_cost_per_sqm >= 0),
  ADD CONSTRAINT chk_user_non_allocable_ratio CHECK (non_allocable_hausgeld_ratio IS NULL OR (non_allocable_hausgeld_ratio >= 0 AND non_allocable_hausgeld_ratio <= 1)),
  ADD CONSTRAINT chk_user_cost_increase CHECK (cost_increase_rate IS NULL OR (cost_increase_rate >= 0 AND cost_increase_rate <= 0.5)),
  ADD CONSTRAINT chk_user_rent_increase CHECK (rent_increase_rate IS NULL OR (rent_increase_rate >= 0 AND rent_increase_rate <= 0.5)),
  ADD CONSTRAINT chk_user_value_appreciation CHECK (value_appreciation_rate IS NULL OR (value_appreciation_rate >= -0.2 AND value_appreciation_rate <= 0.5));
