-- Migration: Fix calculate_user_preferences function
-- Created: 2025-12-13
-- Description: Fix the features check to use TEXT[] comparison instead of JSONB operator

-- Drop and recreate the function with fixed features check
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
  -- Fixed: Using TEXT[] comparison with = ANY() instead of JSONB ? operator
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
      AND feature = ANY(p.features)
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

COMMENT ON FUNCTION calculate_user_preferences(UUID) IS 'Extracts and updates user preferences from interaction history - fixed TEXT[] features check';
