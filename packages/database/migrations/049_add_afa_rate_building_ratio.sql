-- Migration: Add afa_rate and building_ratio columns to properties
-- These allow storing individual AfA rates and building ratios per property

-- Add afa_rate column (decimal, e.g. 0.02 for 2%)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS afa_rate DECIMAL(5,4);

-- Add building_ratio column (decimal, e.g. 0.80 for 80%)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS building_ratio DECIMAL(5,4);

-- Update existing properties based on afa_type
UPDATE properties
SET
  afa_rate = CASE afa_type
    WHEN 'denkmal' THEN 0.09
    WHEN 'neubau' THEN 0.05
    WHEN 'altbau' THEN 0.025
    ELSE 0.02  -- bestand
  END,
  building_ratio = CASE afa_type
    WHEN 'denkmal' THEN 0.35
    WHEN 'neubau' THEN 0.85
    ELSE 0.80  -- bestand, altbau
  END
WHERE afa_rate IS NULL OR building_ratio IS NULL;

-- Add comments
COMMENT ON COLUMN properties.afa_rate IS 'AfA depreciation rate as decimal (e.g. 0.02 = 2%, 0.05 = 5%, 0.09 = 9%)';
COMMENT ON COLUMN properties.building_ratio IS 'Building value ratio as decimal (e.g. 0.80 = 80% building, 20% land)';
