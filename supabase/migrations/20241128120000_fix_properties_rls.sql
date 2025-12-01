-- Fix RLS policy for properties table
-- Allow authenticated users to create properties without requiring agent_id

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Agents can create properties" ON properties;

-- Create a new policy that allows any authenticated user to create properties
CREATE POLICY "Authenticated users can create properties"
  ON properties FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also allow users to view their own properties (by checking if they created it)
-- First, add a seller_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'properties' AND column_name = 'seller_id') THEN
        ALTER TABLE properties ADD COLUMN seller_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Update policy to allow users to view/manage their own properties
DROP POLICY IF EXISTS "Agents can view all their properties" ON properties;
DROP POLICY IF EXISTS "Agents can update their own properties" ON properties;
DROP POLICY IF EXISTS "Agents can delete their own properties" ON properties;

CREATE POLICY "Users can view their own properties"
  ON properties FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid() OR status = 'active');

CREATE POLICY "Users can update their own properties"
  ON properties FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can delete their own properties"
  ON properties FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid());
