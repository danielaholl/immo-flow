-- Migration: Add address column to user_profiles table
-- Created: 2025-12-12

-- Add address column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.address IS 'User physical address (street, city, postal code)';
