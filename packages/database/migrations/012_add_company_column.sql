-- =====================================================
-- ADD COMPANY COLUMN TO USER PROFILES
-- =====================================================
-- Migration 012: Add missing company column

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS company TEXT;

COMMENT ON COLUMN user_profiles.company IS 'Company name (optional)';
