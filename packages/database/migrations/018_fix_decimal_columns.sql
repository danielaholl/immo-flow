-- =====================================================
-- FIX DECIMAL COLUMNS IN PROPERTIES
-- =====================================================
-- Migration 018: Change integer columns to decimal for proper value storage

-- Change usable_area from INTEGER to DECIMAL
ALTER TABLE properties
  ALTER COLUMN usable_area TYPE DECIMAL(10,2) USING usable_area::DECIMAL(10,2);

-- Change monthly_fee from INTEGER to DECIMAL
ALTER TABLE properties
  ALTER COLUMN monthly_fee TYPE DECIMAL(10,2) USING monthly_fee::DECIMAL(10,2);

-- Update constraints
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_usable_area_check,
  DROP CONSTRAINT IF EXISTS properties_monthly_fee_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_usable_area_check CHECK (usable_area IS NULL OR usable_area >= 0),
  ADD CONSTRAINT properties_monthly_fee_check CHECK (monthly_fee IS NULL OR monthly_fee >= 0);

COMMENT ON COLUMN properties.usable_area IS 'Usable area in square meters (can have decimals)';
COMMENT ON COLUMN properties.monthly_fee IS 'Monthly maintenance fee in EUR (can have decimals)';
