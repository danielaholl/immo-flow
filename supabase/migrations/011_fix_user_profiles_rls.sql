-- =====================================================
-- FIX user_profiles RLS POLICY
-- =====================================================
-- Allow authenticated users to view other users' profiles
-- (needed to display property owner information)

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own profiles" ON user_profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_profiles;

-- Create new policy: authenticated users can view ALL profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can still only insert/update their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all profiles" ON user_profiles
  FOR ALL
  TO service_role
  USING (true);

COMMENT ON POLICY "Authenticated users can view all profiles" ON user_profiles
IS 'Allow viewing all user profiles (needed for property owner display)';
