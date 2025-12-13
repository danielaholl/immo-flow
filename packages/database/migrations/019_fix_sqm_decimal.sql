-- =====================================================
-- FIX SQM AND OTHER NUMERIC COLUMNS TO DECIMAL
-- =====================================================
-- Migration 019: Change sqm and other numeric columns to decimal for proper value storage
-- The value "30.18" is failing because sqm is defined as INTEGER

-- Change sqm from INTEGER to DECIMAL
ALTER TABLE properties
  ALTER COLUMN sqm TYPE DECIMAL(10,2) USING sqm::DECIMAL(10,2);

-- Update constraint for sqm
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_sqm_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_sqm_check CHECK (sqm IS NULL OR sqm >= 0);

COMMENT ON COLUMN properties.sqm IS 'Living area in square meters (can have decimals)';
