-- =====================================================
-- ADD AI_SCORE TO PORTFOLIO PROPERTIES
-- =====================================================
-- Adds AI investment score to portfolio properties

ALTER TABLE portfolio_properties
ADD COLUMN IF NOT EXISTS ai_score INTEGER;

-- Comment
COMMENT ON COLUMN portfolio_properties.ai_score IS 'AI investment score (0-100)';
