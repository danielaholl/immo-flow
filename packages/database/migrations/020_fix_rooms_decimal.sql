-- =====================================================
-- FIX ROOMS COLUMN TO DECIMAL
-- =====================================================
-- Migration 020: Change rooms to decimal for German real estate
-- German properties commonly have 2.5, 3.5 rooms etc.

-- Change rooms from INTEGER to DECIMAL
ALTER TABLE properties
  ALTER COLUMN rooms TYPE DECIMAL(4,1) USING rooms::DECIMAL(4,1);

-- Update constraint for rooms
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_rooms_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_rooms_check CHECK (rooms IS NULL OR rooms >= 0);

COMMENT ON COLUMN properties.rooms IS 'Number of rooms (can have decimals, e.g., 2.5 Zimmer)';
