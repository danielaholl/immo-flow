-- =====================================================
-- RECOMMENDATION SYSTEM - TikTok-Style Algorithm
-- =====================================================
-- This migration creates tables for tracking user interactions
-- and storing personalized recommendations

-- =====================================================
-- PROPERTY INTERACTIONS TABLE
-- =====================================================
-- Tracks all user interactions with properties
CREATE TABLE IF NOT EXISTS property_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Interaction type: 'view', 'favorite', 'unfavorite', 'search_click', 'share'
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'favorite', 'unfavorite', 'search_click', 'share', 'booking')),

  -- Time spent on property detail page (in seconds)
  dwell_time_seconds INTEGER DEFAULT 0,

  -- Source of interaction (e.g., 'search', 'homepage', 'recommendations')
  source TEXT,

  -- Additional metadata (can store search query, etc.)
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_property_interactions_user_id ON property_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_property_interactions_property_id ON property_interactions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_interactions_type ON property_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_property_interactions_created_at ON property_interactions(created_at DESC);

-- Composite index for user + property lookups
CREATE INDEX IF NOT EXISTS idx_property_interactions_user_property ON property_interactions(user_id, property_id);

-- Enable Row Level Security
ALTER TABLE property_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own interactions"
  ON property_interactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON property_interactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON property_interactions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON property_interactions TO authenticated;
GRANT ALL ON property_interactions TO service_role;

-- =====================================================
-- USER PREFERENCES TABLE
-- =====================================================
-- Stores aggregated user preferences based on interactions
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Preferred locations with weights (most interacted locations)
  -- Format: [{"location": "München", "weight": 0.5}, {"location": "Berlin", "weight": 0.3}]
  preferred_locations JSONB DEFAULT '[]',

  -- Price range preferences
  -- Format: {"min": 200000, "max": 500000, "avg": 350000}
  price_range JSONB DEFAULT '{}',

  -- Preferred number of rooms (array of room counts with weights)
  -- Format: [{"rooms": 3, "weight": 0.6}, {"rooms": 4, "weight": 0.4}]
  preferred_rooms JSONB DEFAULT '[]',

  -- Preferred features with weights
  -- Format: [{"feature": "Balkon", "weight": 0.8}, {"feature": "Neubau", "weight": 0.5}]
  preferred_features JSONB DEFAULT '[]',

  -- Total number of interactions used to build this profile
  interaction_count INTEGER DEFAULT 0,

  -- When the profile was last updated
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all preferences"
  ON user_preferences
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON user_preferences TO authenticated;
GRANT ALL ON user_preferences TO service_role;

-- =====================================================
-- HELPER FUNCTION: Update Property Views Count
-- =====================================================
-- Automatically increment views when a view interaction is recorded
CREATE OR REPLACE FUNCTION increment_property_views()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.interaction_type = 'view' THEN
    UPDATE properties
    SET views = COALESCE(views, 0) + 1
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_increment_property_views ON property_interactions;
CREATE TRIGGER trigger_increment_property_views
  AFTER INSERT ON property_interactions
  FOR EACH ROW
  EXECUTE FUNCTION increment_property_views();

-- =====================================================
-- HELPER FUNCTION: Calculate User Preferences
-- =====================================================
-- This function analyzes user interactions and updates their preferences
CREATE OR REPLACE FUNCTION calculate_user_preferences(target_user_id UUID)
RETURNS void AS $$
DECLARE
  total_interactions INTEGER;
BEGIN
  -- Count total interactions
  SELECT COUNT(*) INTO total_interactions
  FROM property_interactions
  WHERE user_id = target_user_id;

  -- If no interactions, exit
  IF total_interactions = 0 THEN
    RETURN;
  END IF;

  -- Calculate and update preferences
  INSERT INTO user_preferences (user_id, preferred_locations, price_range, preferred_rooms, preferred_features, interaction_count, last_updated)
  SELECT
    target_user_id,

    -- Preferred locations (top 5 by interaction count)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'location', location,
          'weight', ROUND((count::numeric / total_interactions), 2)
        ) ORDER BY count DESC
      ), '[]'::jsonb)
      FROM (
        SELECT p.location, COUNT(*) as count
        FROM property_interactions pi
        JOIN properties p ON p.id = pi.property_id
        WHERE pi.user_id = target_user_id
          AND pi.interaction_type IN ('view', 'favorite')
        GROUP BY p.location
        ORDER BY count DESC
        LIMIT 5
      ) locations
    ) as preferred_locations,

    -- Price range (min, max, avg from viewed/favorited properties)
    (
      SELECT jsonb_build_object(
        'min', FLOOR(MIN(price)),
        'max', CEIL(MAX(price)),
        'avg', ROUND(AVG(price))
      )
      FROM property_interactions pi
      JOIN properties p ON p.id = pi.property_id
      WHERE pi.user_id = target_user_id
        AND pi.interaction_type IN ('view', 'favorite')
    ) as price_range,

    -- Preferred rooms (top 3 by interaction count)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'rooms', rooms,
          'weight', ROUND((count::numeric / total_interactions), 2)
        ) ORDER BY count DESC
      ), '[]'::jsonb)
      FROM (
        SELECT p.rooms, COUNT(*) as count
        FROM property_interactions pi
        JOIN properties p ON p.id = pi.property_id
        WHERE pi.user_id = target_user_id
          AND pi.interaction_type IN ('view', 'favorite')
        GROUP BY p.rooms
        ORDER BY count DESC
        LIMIT 3
      ) rooms_data
    ) as preferred_rooms,

    -- Preferred features (features from viewed/favorited properties)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'feature', feature,
          'weight', ROUND((count::numeric / total_interactions), 2)
        ) ORDER BY count DESC
      ), '[]'::jsonb)
      FROM (
        SELECT unnest(p.features) as feature, COUNT(*) as count
        FROM property_interactions pi
        JOIN properties p ON p.id = pi.property_id
        WHERE pi.user_id = target_user_id
          AND pi.interaction_type IN ('view', 'favorite')
          AND p.features IS NOT NULL
        GROUP BY feature
        ORDER BY count DESC
        LIMIT 10
      ) features_data
    ) as preferred_features,

    total_interactions as interaction_count,
    NOW() as last_updated

  ON CONFLICT (user_id) DO UPDATE SET
    preferred_locations = EXCLUDED.preferred_locations,
    price_range = EXCLUDED.price_range,
    preferred_rooms = EXCLUDED.preferred_rooms,
    preferred_features = EXCLUDED.preferred_features,
    interaction_count = EXCLUDED.interaction_count,
    last_updated = NOW();

END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_user_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_user_preferences(UUID) TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE property_interactions IS 'Tracks all user interactions with properties for recommendation algorithm';
COMMENT ON TABLE user_preferences IS 'Stores aggregated user preferences based on their interaction history';
COMMENT ON FUNCTION calculate_user_preferences IS 'Analyzes user interactions and updates their preference profile';
