-- Migration 052: PLZ Market Data Tables
-- Erstellt Tabellen für PLZ-basierte Marktdaten (Kaufpreis/qm, Miete/qm)

-- Haupttabelle für aktuelle Marktdaten pro PLZ
CREATE TABLE IF NOT EXISTS plz_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- PLZ-Identifikation
  plz VARCHAR(5) NOT NULL UNIQUE,
  city VARCHAR(255) NOT NULL,
  district VARCHAR(255),
  federal_state VARCHAR(100),

  -- Kaufpreise (EUR/qm)
  avg_purchase_price_sqm DECIMAL(10,2),      -- Durchschnittlicher Kaufpreis/qm
  purchase_price_min DECIMAL(10,2),          -- Minimum
  purchase_price_max DECIMAL(10,2),          -- Maximum

  -- Mietpreise (EUR/qm Kaltmiete)
  avg_rent_sqm DECIMAL(8,2),                 -- Durchschnittliche Kaltmiete/qm
  rent_min DECIMAL(8,2),
  rent_max DECIMAL(8,2),

  -- Metadaten
  population INT,
  data_source VARCHAR(100) DEFAULT 'ai_estimated',
  confidence_score DECIMAL(3,2) DEFAULT 0.85,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_plz_market_plz ON plz_market_data(plz);
CREATE INDEX IF NOT EXISTS idx_plz_market_city ON plz_market_data(city);
CREATE INDEX IF NOT EXISTS idx_plz_market_state ON plz_market_data(federal_state);

-- Trigger für automatische updated_at Aktualisierung
CREATE OR REPLACE FUNCTION update_plz_market_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plz_market_data_updated_at ON plz_market_data;
CREATE TRIGGER trigger_plz_market_data_updated_at
  BEFORE UPDATE ON plz_market_data
  FOR EACH ROW
  EXECUTE FUNCTION update_plz_market_data_updated_at();

-- Historische Snapshots für Preisentwicklung
CREATE TABLE IF NOT EXISTS plz_market_data_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plz VARCHAR(5) NOT NULL,

  avg_purchase_price_sqm DECIMAL(10,2),
  avg_rent_sqm DECIMAL(8,2),

  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(plz, snapshot_date)
);

-- Indexes für History-Tabelle
CREATE INDEX IF NOT EXISTS idx_plz_history_plz ON plz_market_data_history(plz);
CREATE INDEX IF NOT EXISTS idx_plz_history_date ON plz_market_data_history(snapshot_date DESC);

-- Dokumentation
COMMENT ON TABLE plz_market_data IS 'Market data indexed by postal code (PLZ) for investment analysis - contains purchase prices and rent per sqm';
COMMENT ON COLUMN plz_market_data.avg_purchase_price_sqm IS 'Average purchase price per square meter in EUR';
COMMENT ON COLUMN plz_market_data.avg_rent_sqm IS 'Average cold rent per square meter per month in EUR';
COMMENT ON COLUMN plz_market_data.confidence_score IS 'Data quality score 0.00-1.00 (higher = more reliable)';
COMMENT ON TABLE plz_market_data_history IS 'Historical snapshots of market data for trend analysis';
