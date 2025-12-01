-- Migration: Simplify user ownership model
-- Remove agent_id/seller_id and use only user_id
-- A user can be both buyer and seller

-- 1. Add user_id column to properties if not exists
ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);

-- 3. Copy existing seller_id values to user_id
UPDATE properties SET user_id = seller_id WHERE user_id IS NULL AND seller_id IS NOT NULL;

-- 4. Remove is_seller and is_buyer from user_profiles (no longer needed)
ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_seller;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS is_buyer;

-- 5. Drop the agents table (no longer needed)
DROP TABLE IF EXISTS agents CASCADE;

-- 6. Remove old columns from properties (optional - can keep for backwards compatibility)
-- Uncomment these lines if you want to fully remove the old columns:
-- ALTER TABLE properties DROP COLUMN IF EXISTS agent_id;
-- ALTER TABLE properties DROP COLUMN IF EXISTS seller_id;

-- 7. Update bookings table - rename agent_id to owner_id if needed
ALTER TABLE bookings DROP COLUMN IF EXISTS agent_id;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
