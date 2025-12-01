-- Add address column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- Update the column comment
COMMENT ON COLUMN user_profiles.address IS 'User address for contact purposes';
