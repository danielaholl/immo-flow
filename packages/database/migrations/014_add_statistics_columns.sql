-- =====================================================
-- ADD MISSING STATISTICS COLUMNS
-- =====================================================
-- Migration 014: Add missing columns to property_statistics table

ALTER TABLE property_statistics
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
  ADD COLUMN IF NOT EXISTS avg_suggested_price DECIMAL(12,2) CHECK (avg_suggested_price IS NULL OR avg_suggested_price >= 0),
  ADD COLUMN IF NOT EXISTS positive_feedback_count INTEGER DEFAULT 0 CHECK (positive_feedback_count >= 0),
  ADD COLUMN IF NOT EXISTS neutral_feedback_count INTEGER DEFAULT 0 CHECK (neutral_feedback_count >= 0),
  ADD COLUMN IF NOT EXISTS negative_feedback_count INTEGER DEFAULT 0 CHECK (negative_feedback_count >= 0);

COMMENT ON COLUMN property_statistics.rating_count IS 'Total number of ratings received';
COMMENT ON COLUMN property_statistics.avg_suggested_price IS 'Average price suggested by users';
COMMENT ON COLUMN property_statistics.positive_feedback_count IS 'Number of positive feedback entries';
COMMENT ON COLUMN property_statistics.neutral_feedback_count IS 'Number of neutral feedback entries';
COMMENT ON COLUMN property_statistics.negative_feedback_count IS 'Number of negative feedback entries';
