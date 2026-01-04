-- Migration: Add Grunderwerbsteuer rate to PLZ market data
-- Description: Adds grunderwerbsteuer_rate column to plz_market_data table
--              and populates it with the correct tax rate for each federal state

-- Add grunderwerbsteuer_rate column
ALTER TABLE plz_market_data
ADD COLUMN IF NOT EXISTS grunderwerbsteuer_rate DECIMAL(4,2);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_plz_market_tax_rate
ON plz_market_data(grunderwerbsteuer_rate);

-- Update all existing records based on federal_state
-- Bayern, Sachsen: 3.5%
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 3.5
WHERE LOWER(federal_state) IN ('bayern', 'sachsen');

-- Hamburg: 4.5%
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 4.5
WHERE LOWER(federal_state) = 'hamburg';

-- Baden-Württemberg, Niedersachsen, Rheinland-Pfalz, Sachsen-Anhalt, Bremen: 5.0%
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 5.0
WHERE LOWER(federal_state) IN (
  'baden-württemberg', 'niedersachsen', 'rheinland-pfalz',
  'sachsen-anhalt', 'bremen'
);

-- Berlin, Hessen, Mecklenburg-Vorpommern: 6.0%
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 6.0
WHERE LOWER(federal_state) IN ('berlin', 'hessen', 'mecklenburg-vorpommern');

-- NRW, Saarland, Schleswig-Holstein, Brandenburg, Thüringen: 6.5%
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 6.5
WHERE LOWER(federal_state) IN (
  'nordrhein-westfalen', 'saarland', 'schleswig-holstein',
  'brandenburg', 'thüringen'
);

-- Set default 5.0% for any NULL values (safety fallback)
UPDATE plz_market_data
SET grunderwerbsteuer_rate = 5.0
WHERE grunderwerbsteuer_rate IS NULL;

-- Add comment to column
COMMENT ON COLUMN plz_market_data.grunderwerbsteuer_rate IS
  'Grunderwerbsteuersatz (%) für dieses Bundesland - verwendet für Immobilienkaufberechnungen';
