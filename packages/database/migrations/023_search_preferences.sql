-- Migration: Incorporate search_history into user preferences calculation
-- Created: 2025-12-13
-- Description: Enhanced preference calculation with weighted search history (70% interactions, 30% searches)

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_user_preferences(UUID);

CREATE FUNCTION calculate_user_preferences(target_user_id UUID)
RETURNS void AS $$
DECLARE
  -- Final combined values
  v_preferred_locations JSONB;
  v_min_price DECIMAL;
  v_max_price DECIMAL;
  v_preferred_rooms JSONB;
  v_preferred_features JSONB;
  v_interaction_count INT;
  v_search_count INT;

  -- Interaction-based values (70% weight)
  v_int_locations JSONB;
  v_int_min_price DECIMAL;
  v_int_max_price DECIMAL;
  v_int_rooms JSONB;
  v_int_features JSONB;

  -- Search-based values (30% weight)
  v_search_locations JSONB;
  v_search_min_price DECIMAL;
  v_search_max_price DECIMAL;
  v_search_rooms JSONB;
  v_search_features JSONB;

  -- Weight constants
  c_interaction_weight CONSTANT DECIMAL := 0.70;
  c_search_weight CONSTANT DECIMAL := 0.30;
BEGIN

  -- =========================================
  -- PART 1: INTERACTION-BASED PREFERENCES (70%)
  -- =========================================

  -- Preferred locations from interactions (top 5 by count)
  SELECT jsonb_agg(jsonb_build_object('location', location, 'weight', weight))
  INTO v_int_locations
  FROM (
    SELECT p.location, COUNT(*)::DECIMAL as weight
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
      AND p.location IS NOT NULL
    GROUP BY p.location
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ) sub;

  -- Price range from interactions (10th/90th percentile)
  SELECT
    PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY p.price),
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY p.price)
  INTO v_int_min_price, v_int_max_price
  FROM property_interactions pi
  JOIN properties p ON pi.property_id = p.id
  WHERE pi.user_id = target_user_id
    AND pi.interaction_type IN ('favorite', 'share')
    AND p.price IS NOT NULL;

  -- Rooms from interactions (top 3 by frequency)
  SELECT jsonb_agg(jsonb_build_object('rooms', rooms, 'weight', weight))
  INTO v_int_rooms
  FROM (
    SELECT p.rooms, COUNT(*)::DECIMAL as weight
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
      AND p.rooms IS NOT NULL
    GROUP BY p.rooms
    ORDER BY COUNT(*) DESC
    LIMIT 3
  ) sub;

  -- Features from interactions (appearing in >50% of favorites)
  SELECT jsonb_agg(feature)
  INTO v_int_features
  FROM (
    SELECT unnest(ARRAY['balkon', 'garage', 'garten', 'aufzug', 'keller', 'terrasse', 'einbaukueche', 'stellplatz']) as feature
  ) features
  WHERE (
    SELECT COUNT(*)::FLOAT / NULLIF(COUNT(DISTINCT pi.property_id), 0)
    FROM property_interactions pi
    JOIN properties p ON pi.property_id = p.id
    WHERE pi.user_id = target_user_id
      AND pi.interaction_type IN ('favorite', 'share')
      AND feature = ANY(p.features)
  ) > 0.5;

  -- =========================================
  -- PART 2: SEARCH-BASED PREFERENCES (30%)
  -- Recency weighting: EXP(-0.05 * days) * confidence
  -- =========================================

  -- Locations from searches with recency weighting
  SELECT jsonb_agg(jsonb_build_object('location', location, 'weight', total_weight))
  INTO v_search_locations
  FROM (
    SELECT
      criteria->>'location' as location,
      SUM(
        EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
        * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
      ) as total_weight
    FROM search_history
    WHERE user_id = target_user_id
      AND criteria->>'location' IS NOT NULL
      AND criteria->>'location' != ''
      AND last_searched_at > NOW() - INTERVAL '90 days'
    GROUP BY criteria->>'location'
    ORDER BY total_weight DESC
    LIMIT 5
  ) sub;

  -- Price range from searches (weighted average)
  SELECT
    SUM(
      COALESCE((criteria->>'minPrice')::DECIMAL, 0)
      * EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
      * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
    ) / NULLIF(SUM(
      CASE WHEN criteria->>'minPrice' IS NOT NULL
           THEN EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
                * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
           ELSE 0 END
    ), 0),
    SUM(
      COALESCE((criteria->>'maxPrice')::DECIMAL, 0)
      * EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
      * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
    ) / NULLIF(SUM(
      CASE WHEN criteria->>'maxPrice' IS NOT NULL
           THEN EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
                * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
           ELSE 0 END
    ), 0)
  INTO v_search_min_price, v_search_max_price
  FROM search_history
  WHERE user_id = target_user_id
    AND last_searched_at > NOW() - INTERVAL '90 days';

  -- Rooms from searches with recency weighting
  SELECT jsonb_agg(jsonb_build_object('rooms', rooms, 'weight', total_weight))
  INTO v_search_rooms
  FROM (
    SELECT
      ROUND((criteria->>'rooms')::DECIMAL)::INT as rooms,
      SUM(
        EXP(-0.05 * GREATEST(0, EXTRACT(DAY FROM (NOW() - last_searched_at))))
        * COALESCE((criteria->>'confidence')::DECIMAL, 0.5)
      ) as total_weight
    FROM search_history
    WHERE user_id = target_user_id
      AND criteria->>'rooms' IS NOT NULL
      AND last_searched_at > NOW() - INTERVAL '90 days'
    GROUP BY ROUND((criteria->>'rooms')::DECIMAL)::INT
    ORDER BY total_weight DESC
    LIMIT 3
  ) sub;

  -- Features from recent searches (last 30 days)
  SELECT jsonb_agg(DISTINCT feature)
  INTO v_search_features
  FROM (
    SELECT jsonb_array_elements_text(
      COALESCE(criteria->'features', '[]'::jsonb)
    ) as feature
    FROM search_history
    WHERE user_id = target_user_id
      AND last_searched_at > NOW() - INTERVAL '30 days'
      AND jsonb_array_length(COALESCE(criteria->'features', '[]'::jsonb)) > 0
  ) sub
  WHERE feature IS NOT NULL AND feature != '';

  -- =========================================
  -- PART 3: COMBINE WITH WEIGHTS
  -- =========================================

  -- Combine locations (merge and re-rank by weighted score)
  SELECT jsonb_agg(location ORDER BY final_weight DESC)
  INTO v_preferred_locations
  FROM (
    SELECT location, SUM(weighted_score) as final_weight
    FROM (
      -- Interaction locations (70% weight)
      SELECT
        elem->>'location' as location,
        (elem->>'weight')::DECIMAL * c_interaction_weight as weighted_score
      FROM jsonb_array_elements(COALESCE(v_int_locations, '[]'::jsonb)) elem
      WHERE elem->>'location' IS NOT NULL

      UNION ALL

      -- Search locations (30% weight)
      SELECT
        elem->>'location' as location,
        (elem->>'weight')::DECIMAL * c_search_weight as weighted_score
      FROM jsonb_array_elements(COALESCE(v_search_locations, '[]'::jsonb)) elem
      WHERE elem->>'location' IS NOT NULL
    ) combined
    GROUP BY location
    ORDER BY final_weight DESC
    LIMIT 3
  ) top_locations;

  -- Combine price range with weights
  -- If only one source has data, use that source at 100%
  IF v_int_min_price IS NOT NULL AND v_search_min_price IS NOT NULL THEN
    v_min_price := v_int_min_price * c_interaction_weight + v_search_min_price * c_search_weight;
  ELSIF v_int_min_price IS NOT NULL THEN
    v_min_price := v_int_min_price;
  ELSIF v_search_min_price IS NOT NULL THEN
    v_min_price := v_search_min_price;
  ELSE
    v_min_price := NULL;
  END IF;

  IF v_int_max_price IS NOT NULL AND v_search_max_price IS NOT NULL THEN
    v_max_price := v_int_max_price * c_interaction_weight + v_search_max_price * c_search_weight;
  ELSIF v_int_max_price IS NOT NULL THEN
    v_max_price := v_int_max_price;
  ELSIF v_search_max_price IS NOT NULL THEN
    v_max_price := v_search_max_price;
  ELSE
    v_max_price := NULL;
  END IF;

  -- Combine rooms (merge and re-rank)
  SELECT jsonb_agg(rooms ORDER BY final_weight DESC)
  INTO v_preferred_rooms
  FROM (
    SELECT rooms, SUM(weighted_score) as final_weight
    FROM (
      SELECT
        ROUND((elem->>'rooms')::DECIMAL)::INT as rooms,
        (elem->>'weight')::DECIMAL * c_interaction_weight as weighted_score
      FROM jsonb_array_elements(COALESCE(v_int_rooms, '[]'::jsonb)) elem
      WHERE elem->>'rooms' IS NOT NULL

      UNION ALL

      SELECT
        ROUND((elem->>'rooms')::DECIMAL)::INT as rooms,
        (elem->>'weight')::DECIMAL * c_search_weight as weighted_score
      FROM jsonb_array_elements(COALESCE(v_search_rooms, '[]'::jsonb)) elem
      WHERE elem->>'rooms' IS NOT NULL
    ) combined
    GROUP BY rooms
    ORDER BY final_weight DESC
    LIMIT 2
  ) top_rooms;

  -- Combine features (union of both sets, prioritize interaction features)
  SELECT jsonb_agg(DISTINCT feature)
  INTO v_preferred_features
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(v_int_features, '[]'::jsonb)) as feature
    UNION
    SELECT jsonb_array_elements_text(COALESCE(v_search_features, '[]'::jsonb)) as feature
  ) all_features
  WHERE feature IS NOT NULL;

  -- Count interactions and searches for stats
  SELECT COUNT(*) INTO v_interaction_count
  FROM property_interactions WHERE user_id = target_user_id;

  SELECT COUNT(*) INTO v_search_count
  FROM search_history WHERE user_id = target_user_id;

  -- =========================================
  -- PART 4: UPSERT PREFERENCES
  -- =========================================

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
    v_interaction_count + v_search_count,
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

COMMENT ON FUNCTION calculate_user_preferences(UUID) IS
  'Calculates user preferences from interactions (70%) and search history (30%) with recency weighting for searches';

-- Add GIN index for efficient JSONB queries on search_history.criteria
CREATE INDEX IF NOT EXISTS idx_search_history_criteria_gin
  ON search_history USING GIN (criteria);

-- Add index for recency filtering
CREATE INDEX IF NOT EXISTS idx_search_history_user_recent
  ON search_history (user_id, last_searched_at DESC);
