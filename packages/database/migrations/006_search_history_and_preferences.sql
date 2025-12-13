-- Migration: Add search_history and user_preferences tables
-- Created: 2025-12-12

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  criteria JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER DEFAULT 0,
  last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(last_searched_at DESC);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_locations JSONB DEFAULT '[]'::jsonb,
  price_range JSONB DEFAULT '{}'::jsonb,
  preferred_rooms JSONB DEFAULT '[]'::jsonb,
  preferred_features JSONB DEFAULT '[]'::jsonb,
  interaction_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create property_interactions table for tracking user behavior
CREATE TABLE IF NOT EXISTS property_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'unfavorite', 'search_click', 'share', 'booking')),
  dwell_time_seconds INTEGER DEFAULT 0,
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_property_interactions_user_id ON property_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_property_interactions_property_id ON property_interactions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_interactions_created_at ON property_interactions(created_at DESC);

-- Function to calculate user preferences based on interactions
CREATE OR REPLACE FUNCTION calculate_user_preferences(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- This is a placeholder function
  -- In a real implementation, this would analyze property_interactions
  -- and calculate weighted preferences

  INSERT INTO user_preferences (user_id, interaction_count, last_updated)
  VALUES (target_user_id, 0, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    interaction_count = (SELECT COUNT(*) FROM property_interactions WHERE user_id = target_user_id),
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;
