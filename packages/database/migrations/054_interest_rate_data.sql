-- =====================================================
-- INTEREST RATE DATA TABLES
-- =====================================================
-- Tabellen fuer woechentliche Zinsdaten aus ZINSUPDATE-Bildern
-- Ermoeglicht historische Speicherung und automatische Calculator-Defaults

-- Haupttabelle fuer Zinsupdate-Uploads
CREATE TABLE IF NOT EXISTS interest_rate_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Zeitliche Zuordnung
  calendar_week INT NOT NULL CHECK (calendar_week >= 1 AND calendar_week <= 53),
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  upload_date TIMESTAMPTZ DEFAULT NOW(),

  -- Bild-Referenz
  image_url TEXT,

  -- TOP-ZINS (Basis: 90% Beleihung, 10 Jahre, 250k EUR Objektwert)
  top_rate DECIMAL(5,3) NOT NULL CHECK (top_rate > 0 AND top_rate < 20),
  min_rate DECIMAL(5,3),
  max_rate DECIMAL(5,3),

  -- Verarbeitungsstatus
  status VARCHAR(20) DEFAULT 'processed' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  error_message TEXT,

  -- AI-Extraktion Rohdaten
  raw_extracted_data JSONB,
  extraction_confidence DECIMAL(3,2) CHECK (extraction_confidence >= 0 AND extraction_confidence <= 1),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eindeutigkeit: Ein Eintrag pro Kalenderwoche pro Jahr
  UNIQUE(calendar_week, year)
);

-- Matrix-Tabelle: Zinssaetze nach Finanzierungsquote und Zinsbindung
CREATE TABLE IF NOT EXISTS interest_rate_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES interest_rate_updates(id) ON DELETE CASCADE,

  -- Matrix-Dimensionen
  loan_to_value INT NOT NULL CHECK (loan_to_value IN (50, 70, 80, 90, 100)),
  fixed_rate_years INT NOT NULL CHECK (fixed_rate_years IN (5, 10, 15, 20, 30)),

  -- Zinssatz
  interest_rate DECIMAL(5,3) NOT NULL CHECK (interest_rate > 0 AND interest_rate < 20),

  -- Aufschlag/Abschlag zum TOP-ZINS (zur Referenz)
  rate_delta DECIMAL(5,3),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eindeutigkeit: Eine Kombination pro Update
  UNIQUE(update_id, loan_to_value, fixed_rate_years)
);

-- Aufschlaege nach Objektwert
CREATE TABLE IF NOT EXISTS interest_rate_property_value_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES interest_rate_updates(id) ON DELETE CASCADE,

  -- Objektwert-Schwellen (in EUR)
  property_value_min INT NOT NULL CHECK (property_value_min >= 0),
  property_value_max INT CHECK (property_value_max IS NULL OR property_value_max > property_value_min),

  -- Aufschlag/Abschlag in Prozentpunkten (z.B. +0.10 oder -0.10)
  rate_adjustment DECIMAL(5,3) NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eindeutigkeit
  UNIQUE(update_id, property_value_min)
);

-- Historische Zinsentwicklung (aggregiert fuer Charts)
CREATE TABLE IF NOT EXISTS interest_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  calendar_week INT NOT NULL CHECK (calendar_week >= 1 AND calendar_week <= 53),
  year INT NOT NULL CHECK (year >= 2020 AND year <= 2100),
  snapshot_date DATE NOT NULL,

  -- Hauptkennzahlen fuer schnelle Chart-Abfragen
  top_rate DECIMAL(5,3) NOT NULL,
  avg_rate_10y_80pct DECIMAL(5,3),  -- 10 Jahre, 80% Beleihung (Standard)
  avg_rate_10y_90pct DECIMAL(5,3),  -- 10 Jahre, 90% Beleihung
  avg_rate_15y_80pct DECIMAL(5,3),  -- 15 Jahre, 80% Beleihung

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Eindeutigkeit
  UNIQUE(calendar_week, year)
);

-- Indexes fuer Performance
CREATE INDEX IF NOT EXISTS idx_interest_updates_week_year
  ON interest_rate_updates(year DESC, calendar_week DESC);

CREATE INDEX IF NOT EXISTS idx_interest_updates_status
  ON interest_rate_updates(status);

CREATE INDEX IF NOT EXISTS idx_interest_matrix_update
  ON interest_rate_matrix(update_id);

CREATE INDEX IF NOT EXISTS idx_interest_matrix_ltv_years
  ON interest_rate_matrix(loan_to_value, fixed_rate_years);

CREATE INDEX IF NOT EXISTS idx_interest_adjustments_update
  ON interest_rate_property_value_adjustments(update_id);

CREATE INDEX IF NOT EXISTS idx_interest_history_date
  ON interest_rate_history(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_interest_history_week_year
  ON interest_rate_history(year DESC, calendar_week DESC);

-- Trigger fuer updated_at
CREATE OR REPLACE FUNCTION update_interest_rate_updates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_interest_rate_updates_timestamp ON interest_rate_updates;
CREATE TRIGGER trigger_interest_rate_updates_timestamp
  BEFORE UPDATE ON interest_rate_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_interest_rate_updates_timestamp();

-- Dokumentation
COMMENT ON TABLE interest_rate_updates IS 'Woechentliche Zinsupdates extrahiert aus ZINSUPDATE-Bildern';
COMMENT ON TABLE interest_rate_matrix IS 'Zinsmatrix nach Beleihungsquote (LTV) und Zinsbindung';
COMMENT ON TABLE interest_rate_property_value_adjustments IS 'Zinsaufschlaege/-abschlaege nach Objektwert';
COMMENT ON TABLE interest_rate_history IS 'Historische Zinsentwicklung fuer Charts und Analysen';

COMMENT ON COLUMN interest_rate_updates.top_rate IS 'TOP-ZINS bei 90% Beleihung, 10 Jahre, 250k EUR';
COMMENT ON COLUMN interest_rate_matrix.loan_to_value IS 'Beleihungsquote in Prozent (50, 70, 80, 90, 100)';
COMMENT ON COLUMN interest_rate_matrix.fixed_rate_years IS 'Zinsbindung in Jahren (5, 10, 15, 20, 30)';
COMMENT ON COLUMN interest_rate_matrix.rate_delta IS 'Differenz zum TOP-ZINS in Prozentpunkten';
