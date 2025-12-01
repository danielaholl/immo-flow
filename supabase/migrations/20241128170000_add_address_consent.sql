-- Add address_consent field to user_profiles table
-- This field tracks whether the user has consented to see detailed addresses

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS address_consent BOOLEAN DEFAULT FALSE;

-- Add consent_given_at timestamp to track when consent was given
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS consent_given_at TIMESTAMPTZ DEFAULT NULL;
