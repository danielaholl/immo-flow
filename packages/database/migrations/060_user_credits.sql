-- Migration: 060_user_credits.sql
-- Description: Credits system for user benefits (e.g., free AI evaluations, featured listings)
-- Date: 2025-01-04

-- Credits system for user benefits
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL, -- 'ai_evaluation', 'featured_listing', etc.
  amount INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_credits_user ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_type ON user_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires ON user_credits(expires_at);

COMMENT ON TABLE user_credits IS 'Credits system for user benefits (e.g., free AI evaluations)';
