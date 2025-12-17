-- Add is_external column to properties table
-- This column indicates if a property was imported from an external source (URL or PDF)

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_external BOOLEAN DEFAULT FALSE;

-- Add is_community_shared column if not exists
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_community_shared BOOLEAN DEFAULT FALSE;

-- Add external_url column if not exists
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS external_url TEXT;

-- Add external_source column if not exists
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS external_source TEXT;

-- Comment on columns
COMMENT ON COLUMN properties.is_external IS 'Indicates if property was imported from external source';
COMMENT ON COLUMN properties.is_community_shared IS 'If true, external property is visible to other users';
COMMENT ON COLUMN properties.external_url IS 'URL of original listing on external portal';
COMMENT ON COLUMN properties.external_source IS 'Source portal: immoscout24, kleinanzeigen, immowelt, other';
