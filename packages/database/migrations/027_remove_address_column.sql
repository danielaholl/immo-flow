-- Migration: Remove redundant address column
-- The address column is redundant because we have separate fields:
-- - location (city/area)
-- - postal_code (PLZ)
-- - street_address (street and house number)

-- First, migrate any existing data from address to street_address (if street_address is empty)
UPDATE properties
SET street_address = address
WHERE street_address IS NULL AND address IS NOT NULL;

-- Then remove the address column
ALTER TABLE properties DROP COLUMN IF EXISTS address;
