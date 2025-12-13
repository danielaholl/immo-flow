-- =====================================================
-- ADD AI CONFIDENCE COLUMN TO MESSAGES
-- =====================================================
-- Migration 016: Add ai_confidence column to messages table

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1));

COMMENT ON COLUMN messages.ai_confidence IS 'AI confidence score for generated messages (0.0 to 1.0)';
