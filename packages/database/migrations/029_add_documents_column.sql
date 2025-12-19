-- Migration: Add documents field to properties table
-- Date: 2025-12-17
-- Description: Adds support for property documents (PDFs, images) with categories

-- Add documents column as JSONB array
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN properties.documents IS 'Array of property documents: [{id, url, thumbnailUrl, filename, category, mimetype, size, uploadedAt}]';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_properties_documents ON properties USING GIN (documents);
