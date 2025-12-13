-- =====================================================
-- ADD FORWARDED TO SELLER COLUMN TO MESSAGES
-- =====================================================
-- Migration 017: Add forwarded_to_seller column to messages table

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS forwarded_to_seller BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN messages.forwarded_to_seller IS 'Whether this message was forwarded to the seller (for AI-to-human handoff)';
