-- Migration 053: Add Stadtteil (suburb) column to PLZ market data
-- Separate column for district/suburb names from OpenStreetMap

ALTER TABLE plz_market_data
ADD COLUMN IF NOT EXISTS stadtteil VARCHAR(255);

-- Index for searching by stadtteil
CREATE INDEX IF NOT EXISTS idx_plz_market_stadtteil ON plz_market_data(stadtteil);

COMMENT ON COLUMN plz_market_data.stadtteil IS 'Suburb/district name from OpenStreetMap (e.g., Obermenzing, Schwabing)';
