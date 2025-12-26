-- Migration: Add afa_type column to properties table
-- This enables per-property depreciation (AfA) type selection for tax calculations

-- Add afa_type column with default value
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS afa_type TEXT
DEFAULT 'bestand'
CHECK (afa_type IN ('bestand', 'altbau', 'neubau', 'denkmal'));

-- Update existing properties to have the default value
UPDATE properties SET afa_type = 'bestand' WHERE afa_type IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN properties.afa_type IS 'AfA depreciation type: bestand (2% - after 1925), altbau (2.5% - before 1925), neubau (5% degressive), denkmal (9% on renovation)';
