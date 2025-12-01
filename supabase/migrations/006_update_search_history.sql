-- Add last_searched_at column to track when a search was last executed
ALTER TABLE search_history
ADD COLUMN IF NOT EXISTS last_searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have last_searched_at = created_at
UPDATE search_history
SET last_searched_at = created_at
WHERE last_searched_at IS NULL;

-- Add index for last_searched_at to speed up queries
CREATE INDEX IF NOT EXISTS idx_search_history_last_searched ON search_history(last_searched_at DESC);

-- Add unique constraint on user_id and query to prevent exact duplicates
-- First, remove any existing duplicates, keeping the most recent one
DELETE FROM search_history a
USING search_history b
WHERE a.user_id = b.user_id
  AND a.query = b.query
  AND a.id < b.id;

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_history_user_query ON search_history(user_id, query);
