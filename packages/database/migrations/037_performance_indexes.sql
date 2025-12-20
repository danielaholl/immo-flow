-- Performance Indexes Migration
-- Adds composite indexes for common query patterns

-- Index for property_interactions (user activity queries)
-- Used in recommendation engine and user preferences calculation
CREATE INDEX IF NOT EXISTS idx_property_interactions_user_type_date
  ON property_interactions(user_id, interaction_type, created_at DESC);

-- Index for properties by status and created date
-- Used in feed queries and property listings
CREATE INDEX IF NOT EXISTS idx_properties_status_created
  ON properties(status, created_at DESC);

-- GIN index for JSONB features array
-- Enables fast @> containment queries for feature search
CREATE INDEX IF NOT EXISTS idx_properties_features_gin
  ON properties USING GIN(features jsonb_path_ops);

-- Index for property statistics (views, favorites ranking)
CREATE INDEX IF NOT EXISTS idx_property_statistics_property_views
  ON property_statistics(property_id, total_views DESC);

-- Index for user preferences by user and last update
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_updated
  ON user_preferences(user_id, last_updated DESC);

-- Index for messages in conversations (chat performance)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_date
  ON messages(conversation_id, created_at DESC);

-- Index for conversations by seller and last message
CREATE INDEX IF NOT EXISTS idx_conversations_seller_last_msg
  ON conversations(seller_id, last_message_at DESC);

-- Index for properties by user and status
CREATE INDEX IF NOT EXISTS idx_properties_user_status
  ON properties(user_id, status);

-- Index for search history (popular searches)
CREATE INDEX IF NOT EXISTS idx_search_history_query
  ON search_history(query, last_searched_at DESC);

-- Index for favorites user lookup
CREATE INDEX IF NOT EXISTS idx_favorites_user_property
  ON favorites(user_id, property_id);

-- Partial index for active properties only (most common queries)
CREATE INDEX IF NOT EXISTS idx_properties_active_price
  ON properties(price, sqm, rooms)
  WHERE status = 'active';

-- Analyze tables to update statistics for query planner
ANALYZE property_interactions;
ANALYZE properties;
ANALYZE property_statistics;
ANALYZE user_preferences;
ANALYZE messages;
ANALYZE conversations;
ANALYZE search_history;
ANALYZE favorites;
