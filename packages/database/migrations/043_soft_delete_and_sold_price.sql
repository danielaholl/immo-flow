-- Migration 043: Soft Delete and Sold Price
-- Description: Adds soft-delete support and sold_price for historical market comparison

-- Add deleted_at column for soft-delete
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add sold_price column for actual achieved sale price (for historical comparison)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sold_price INTEGER CHECK (sold_price > 0);

-- Add sold_at column for when the property was sold
ALTER TABLE properties ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

-- Create index for soft-delete queries (only show non-deleted)
CREATE INDEX IF NOT EXISTS properties_deleted_at_idx ON properties(deleted_at);

-- Create index for sold properties with sold_price (for market comparison)
CREATE INDEX IF NOT EXISTS properties_sold_price_idx ON properties(sold_price) WHERE sold_price IS NOT NULL;

-- Create composite index for market comparison queries (location + sold + recent)
CREATE INDEX IF NOT EXISTS properties_market_comparison_idx
ON properties(location, sold_at DESC)
WHERE status = 'sold' AND deleted_at IS NULL AND sold_price IS NOT NULL;

-- Comment explaining the soft-delete pattern
COMMENT ON COLUMN properties.deleted_at IS 'Soft delete timestamp. If set, property is considered deleted but kept for historical analysis.';
COMMENT ON COLUMN properties.sold_price IS 'Actual achieved sale price (may differ from listing price). Used for market comparison.';
COMMENT ON COLUMN properties.sold_at IS 'Date when the property was sold.';
