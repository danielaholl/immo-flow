-- Migration: Recommendation System
-- Created: 2025-12-12
-- Description: Adds tables and functions for hybrid recommendation algorithm

-- 1. Property Similarities (Collaborative Filtering)
CREATE TABLE IF NOT EXISTS property_similarities (
  property_a_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  property_b_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  similarity_score DECIMAL(3,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  common_users INT NOT NULL DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (property_a_id, property_b_id),
  CHECK (property_a_id < property_b_id) -- Verhindert Duplikate (A,B) und (B,A)
);

CREATE INDEX IF NOT EXISTS idx_similarities_score ON property_similarities(similarity_score DESC);
COMMENT ON TABLE property_similarities IS 'Stores item-item similarity scores for collaborative filtering';

-- 2. Property Trending Scores
CREATE TABLE IF NOT EXISTS property_trending (
  property_id UUID PRIMARY KEY REFERENCES properties(id) ON DELETE CASCADE,
  views_last_7d INT DEFAULT 0,
  favorites_last_7d INT DEFAULT 0,
  contacts_last_7d INT DEFAULT 0,
  shares_last_7d INT DEFAULT 0,
  trending_score DECIMAL(10,2) DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trending_score ON property_trending(trending_score DESC);
COMMENT ON TABLE property_trending IS 'Stores popularity metrics and trending scores for properties';

-- 3. Recommendations Cache
CREATE TABLE IF NOT EXISTS recommendations_cache (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  final_score DECIMAL(5,2) NOT NULL,
  content_score DECIMAL(5,2),
  collaborative_score DECIMAL(5,2),
  popularity_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_cache_user_score ON recommendations_cache(user_id, final_score DESC);
COMMENT ON TABLE recommendations_cache IS 'Pre-calculated recommendations for active users';

-- 4. Update user_preferences table structure (add missing columns)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS min_price DECIMAL;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS max_price DECIMAL;

COMMENT ON COLUMN user_preferences.min_price IS 'Minimum price preference extracted from interactions';
COMMENT ON COLUMN user_preferences.max_price IS 'Maximum price preference extracted from interactions';

-- 5. Enhanced calculate_user_preferences() Function
-- Drop old function first to avoid parameter name conflicts
DROP FUNCTION IF EXISTS calculate_user_preferences(UUID);

CREATE FUNCTION calculate_user_preferences(target_user_id UUID)
RETURNS void AS $$
DECLARE
  v_preferred_locations JSONB;
  v_min_price DECIMAL;
  v_max_price DECIMAL;
  v_preferred_rooms JSONB;
  v_preferred_features JSONB;
  v_interaction_count INT;
BEGIN
  -- Extract preferred locations (top 3 most interacted) as JSONB array
  SELECT jsonb_agg(location)
  INTO v_preferred_locations
  FROM (
    SELECT p.location
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
    GROUP BY p.location
    ORDER BY COUNT(*) DESC
    LIMIT 3
  ) sub;

  -- Extract price range (10th and 90th percentile of favorited properties)
  SELECT
    PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY p.price),
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY p.price)
  INTO v_min_price, v_max_price
  FROM property_interactions pi
  JOIN properties p ON pi.property_id = p.id
  WHERE pi.user_id = target_user_id
    AND pi.interaction_type IN ('favorite', 'share');

  -- Extract preferred room count (mode) as JSONB array
  SELECT jsonb_agg(rooms)
  INTO v_preferred_rooms
  FROM (
    SELECT p.rooms
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
    GROUP BY p.rooms
    ORDER BY COUNT(*) DESC
    LIMIT 2
  ) sub;

  -- Extract preferred features (features appearing in >50% of favorites)
  SELECT jsonb_agg(feature)
  INTO v_preferred_features
  FROM (
    SELECT unnest(ARRAY['balkon', 'garage', 'garten', 'aufzug', 'keller']) as feature
  ) features
  WHERE (
    SELECT COUNT(*)::FLOAT / NULLIF(COUNT(DISTINCT pi.property_id), 0)
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
      AND p.features ? feature
  ) > 0.5;

  -- Count total interactions
  SELECT COUNT(*)
  INTO v_interaction_count
  FROM property_interactions
  WHERE user_id = target_user_id;

  -- Update or Insert preferences (using JSONB for compatibility)
  INSERT INTO user_preferences (
    user_id,
    preferred_locations,
    min_price,
    max_price,
    preferred_rooms,
    preferred_features,
    interaction_count,
    last_updated
  )
  VALUES (
    target_user_id,
    COALESCE(v_preferred_locations, '[]'::jsonb),
    v_min_price,
    v_max_price,
    COALESCE(v_preferred_rooms, '[]'::jsonb),
    COALESCE(v_preferred_features, '[]'::jsonb),
    v_interaction_count,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    preferred_locations = EXCLUDED.preferred_locations,
    min_price = EXCLUDED.min_price,
    max_price = EXCLUDED.max_price,
    preferred_rooms = EXCLUDED.preferred_rooms,
    preferred_features = EXCLUDED.preferred_features,
    interaction_count = EXCLUDED.interaction_count,
    last_updated = EXCLUDED.last_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_preferences(UUID) IS 'Extracts and updates user preferences from interaction history using collaborative data';
