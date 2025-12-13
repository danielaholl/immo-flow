-- =====================================================
-- FIX MISSING SCHEMA ELEMENTS
-- =====================================================
-- Migration 011: Add missing columns and tables
-- Fixes: Column 'actual_monthly_rent' and table 'user_dismissed_properties'

-- Add actual_monthly_rent column to properties table
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS actual_monthly_rent INTEGER CHECK (actual_monthly_rent >= 0);

-- Add important_notes column if it doesn't exist (used in properties router)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS important_notes TEXT;

-- Add energy_efficiency_class column if it doesn't exist (used in properties router)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS energy_efficiency_class TEXT CHECK (
    energy_efficiency_class IN ('A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H')
  );

-- =====================================================
-- USER DISMISSED PROPERTIES TABLE
-- =====================================================
-- Table to track properties that users have dismissed/are not interested in
CREATE TABLE IF NOT EXISTS user_dismissed_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT,

  -- Ensure unique dismissed per user and property
  UNIQUE(user_id, property_id)
);

-- Add indexes for user_dismissed_properties
CREATE INDEX IF NOT EXISTS idx_user_dismissed_user_id
  ON user_dismissed_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dismissed_property_id
  ON user_dismissed_properties(property_id);
CREATE INDEX IF NOT EXISTS idx_user_dismissed_dismissed_at
  ON user_dismissed_properties(dismissed_at DESC);

-- =====================================================
-- PERFORMANCE INDEXES (Fix N+1 queries and slow lookups)
-- =====================================================

-- Composite index for filtering properties by user and status
CREATE INDEX IF NOT EXISTS idx_properties_user_id_status
  ON properties(user_id, status);

-- Composite index for favorites lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_property
  ON favorites(user_id, property_id);

-- Index for property location-based searches
CREATE INDEX IF NOT EXISTS idx_properties_location_status
  ON properties(location, status) WHERE status = 'active';

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_properties_price_status
  ON properties(price, status) WHERE status = 'active';

-- Index for recommendations (location + price combination)
CREATE INDEX IF NOT EXISTS idx_properties_recommendations
  ON properties(location, price, rooms, property_type)
  WHERE status = 'active';

-- =====================================================
-- ROW LEVEL SECURITY FOR user_dismissed_properties
-- =====================================================

-- Note: RLS policies are handled at application level
-- Skipping RLS setup as it's not using Supabase auth

-- Add comment
COMMENT ON TABLE user_dismissed_properties IS 'Tracks properties that users have dismissed or marked as not interested';
COMMENT ON COLUMN properties.actual_monthly_rent IS 'Actual monthly rent amount (may differ from listed monthly_rent)';
