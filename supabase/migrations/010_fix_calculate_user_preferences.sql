-- =====================================================
-- FIX calculate_user_preferences FUNCTION
-- =====================================================
-- Fixes "more than one row returned by a subquery" error
-- by properly aggregating with SUM() after GROUP BY

DROP FUNCTION IF EXISTS calculate_user_preferences(UUID);

CREATE OR REPLACE FUNCTION calculate_user_preferences(target_user_id UUID)
RETURNS void AS $$
DECLARE
  total_interactions INTEGER;
  total_searches INTEGER;
BEGIN
  -- Count total interactions
  SELECT COUNT(*) INTO total_interactions
  FROM property_interactions
  WHERE user_id = target_user_id;

  -- Count total searches
  SELECT COUNT(*) INTO total_searches
  FROM search_history
  WHERE user_id = target_user_id;

  -- If no interactions AND no searches, exit
  IF total_interactions = 0 AND total_searches = 0 THEN
    RETURN;
  END IF;

  -- Calculate and update preferences
  INSERT INTO user_preferences (user_id, preferred_locations, price_range, preferred_rooms, preferred_features, interaction_count, last_updated)
  SELECT
    target_user_id,

    -- Preferred locations (combining interactions AND searches)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'location', location,
          'weight', ROUND((total_weight::numeric / GREATEST(total_interactions + (total_searches * 0.5), 1)), 2)
        ) ORDER BY total_weight DESC
      ), '[]'::jsonb)
      FROM (
        SELECT
          location,
          SUM(weighted_count) as total_weight
        FROM (
          -- Locations from property interactions
          SELECT p.location, COUNT(*) * 1.0 as weighted_count
          FROM property_interactions pi
          JOIN properties p ON p.id = pi.property_id
          WHERE pi.user_id = target_user_id
            AND pi.interaction_type IN ('view', 'favorite')
          GROUP BY p.location

          UNION ALL

          -- Locations from search history (with lower weight)
          SELECT
            (sh.criteria->>'location')::text as location,
            COUNT(*) * 0.5 as weighted_count
          FROM search_history sh
          WHERE sh.user_id = target_user_id
            AND sh.criteria IS NOT NULL
            AND sh.criteria->>'location' IS NOT NULL
            AND sh.criteria->>'location' != ''
          GROUP BY sh.criteria->>'location'
        ) combined_locations
        GROUP BY location
        ORDER BY SUM(weighted_count) DESC
        LIMIT 5
      ) aggregated_locations
    ) as preferred_locations,

    -- Price range (from viewed/favorited properties AND searches)
    (
      SELECT jsonb_build_object(
        'min', FLOOR(LEAST(
          COALESCE((SELECT MIN(price) FROM property_interactions pi JOIN properties p ON p.id = pi.property_id WHERE pi.user_id = target_user_id AND pi.interaction_type IN ('view', 'favorite')), 999999999),
          COALESCE((SELECT MIN((criteria->>'minPrice')::numeric) FROM search_history WHERE user_id = target_user_id AND criteria->>'minPrice' IS NOT NULL AND criteria->>'minPrice' != ''), 999999999)
        )),
        'max', CEIL(GREATEST(
          COALESCE((SELECT MAX(price) FROM property_interactions pi JOIN properties p ON p.id = pi.property_id WHERE pi.user_id = target_user_id AND pi.interaction_type IN ('view', 'favorite')), 0),
          COALESCE((SELECT MAX((criteria->>'maxPrice')::numeric) FROM search_history WHERE user_id = target_user_id AND criteria->>'maxPrice' IS NOT NULL AND criteria->>'maxPrice' != ''), 0)
        )),
        'avg', ROUND((
          COALESCE((SELECT AVG(price) FROM property_interactions pi JOIN properties p ON p.id = pi.property_id WHERE pi.user_id = target_user_id AND pi.interaction_type IN ('view', 'favorite')), 0) +
          COALESCE((SELECT AVG((criteria->>'minPrice')::numeric + (criteria->>'maxPrice')::numeric) / 2 FROM search_history WHERE user_id = target_user_id AND criteria->>'minPrice' IS NOT NULL AND criteria->>'maxPrice' IS NOT NULL), 0)
        ) / 2)
      )
    ) as price_range,

    -- Preferred rooms (combining interactions AND searches)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'rooms', rooms,
          'weight', ROUND((total_weight::numeric / GREATEST(total_interactions + (total_searches * 0.5), 1)), 2)
        ) ORDER BY total_weight DESC
      ), '[]'::jsonb)
      FROM (
        SELECT
          rooms,
          SUM(weighted_count) as total_weight
        FROM (
          -- Rooms from property interactions
          SELECT p.rooms, COUNT(*) * 1.0 as weighted_count
          FROM property_interactions pi
          JOIN properties p ON p.id = pi.property_id
          WHERE pi.user_id = target_user_id
            AND pi.interaction_type IN ('view', 'favorite')
          GROUP BY p.rooms

          UNION ALL

          -- Rooms from search history (with lower weight)
          SELECT
            (sh.criteria->>'rooms')::integer as rooms,
            COUNT(*) * 0.5 as weighted_count
          FROM search_history sh
          WHERE sh.user_id = target_user_id
            AND sh.criteria IS NOT NULL
            AND sh.criteria->>'rooms' IS NOT NULL
            AND sh.criteria->>'rooms' != ''
          GROUP BY sh.criteria->>'rooms'
        ) combined_rooms
        WHERE rooms IS NOT NULL
        GROUP BY rooms
        ORDER BY SUM(weighted_count) DESC
        LIMIT 3
      ) aggregated_rooms
    ) as preferred_rooms,

    -- Preferred features (combining interactions AND searches)
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'feature', feature,
          'weight', ROUND((total_weight::numeric / GREATEST(total_interactions + (total_searches * 0.5), 1)), 2)
        ) ORDER BY total_weight DESC
      ), '[]'::jsonb)
      FROM (
        SELECT
          feature,
          SUM(weighted_count) as total_weight
        FROM (
          -- Features from property interactions
          SELECT unnest(p.features) as feature, COUNT(*) * 1.0 as weighted_count
          FROM property_interactions pi
          JOIN properties p ON p.id = pi.property_id
          WHERE pi.user_id = target_user_id
            AND pi.interaction_type IN ('view', 'favorite')
            AND p.features IS NOT NULL
          GROUP BY feature

          UNION ALL

          -- Features from search history (with lower weight)
          SELECT
            jsonb_array_elements_text(sh.criteria->'features') as feature,
            COUNT(*) * 0.5 as weighted_count
          FROM search_history sh
          WHERE sh.user_id = target_user_id
            AND sh.criteria IS NOT NULL
            AND sh.criteria->'features' IS NOT NULL
            AND jsonb_array_length(sh.criteria->'features') > 0
          GROUP BY feature
        ) combined_features
        GROUP BY feature
        ORDER BY SUM(weighted_count) DESC
        LIMIT 10
      ) aggregated_features
    ) as preferred_features,

    (total_interactions + total_searches) as interaction_count,
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

COMMENT ON FUNCTION calculate_user_preferences IS 'Analyzes user interactions AND search history to update their preference profile (FIXED: proper aggregation with SUM)';
