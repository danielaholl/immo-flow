-- Add 'inactive' status to properties table
-- This status means: saved but not published (not active) and not a draft (not pending)

-- Drop the existing constraint and recreate with new value
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;

ALTER TABLE properties
ADD CONSTRAINT properties_status_check
CHECK (status IN ('active', 'pending', 'archived', 'sold', 'inactive'));

COMMENT ON COLUMN properties.status IS 'Property status: active (published), pending (draft), inactive (saved but not published), archived, sold';
