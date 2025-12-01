-- Fix RLS policy for properties table to use user_id instead of seller_id

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

-- Create new policies using user_id
CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR status = 'active');

CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
