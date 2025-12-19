-- Migration: Add full_access_token field to properties table
-- Date: 2025-12-18
-- Description: Adds support for property share links with full access (address + documents)

-- Add full_access_token column for "Mit Unterlagen teilen" feature
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS full_access_token VARCHAR(32) UNIQUE;

-- Add index for fast lookups by full_access_token
CREATE INDEX IF NOT EXISTS idx_properties_full_access_token
ON properties(full_access_token) WHERE full_access_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN properties.full_access_token IS 'Unique token for full access share links (grants access to address + documents)';
