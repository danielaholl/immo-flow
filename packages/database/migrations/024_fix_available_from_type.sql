-- Migration: Fix available_from column type
-- Created: 2025-12-13
-- Description: Change available_from from DATE to TEXT to support values like "ab sofort", "nach Vereinbarung"

-- Alter column type from DATE to TEXT
ALTER TABLE properties
ALTER COLUMN available_from TYPE TEXT
USING available_from::TEXT;

-- Add comment for documentation
COMMENT ON COLUMN properties.available_from IS 'Availability date or text like "ab sofort", "nach Vereinbarung"';
