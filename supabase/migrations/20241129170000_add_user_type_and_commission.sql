-- Add user type and commission fields
-- This migration adds support for private persons vs real estate agents (Makler)
-- and adds commission fees for properties listed by agents

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Add user_type to user_profiles
ALTER TABLE user_profiles
ADD COLUMN user_type TEXT DEFAULT 'private' CHECK (user_type IN ('private', 'agent'));

-- 2. Add commission field to properties (percentage)
ALTER TABLE properties
ADD COLUMN commission_rate DECIMAL(4,2) CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- 3. Create table for tracking user consents per property
-- (separate from property_consents which tracks address visibility)
CREATE TABLE IF NOT EXISTS commission_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  commission_accepted BOOLEAN DEFAULT false,
  data_sharing_accepted BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique consent per user and property
  UNIQUE(user_id, property_id)
);

-- 4. Create index for faster lookups
CREATE INDEX commission_consents_user_id_idx ON commission_consents(user_id);
CREATE INDEX commission_consents_property_id_idx ON commission_consents(property_id);
CREATE INDEX commission_consents_user_property_idx ON commission_consents(user_id, property_id);

-- 5. Enable RLS on commission_consents
ALTER TABLE commission_consents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for commission_consents
CREATE POLICY "Users can view their own consents"
  ON commission_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own consents"
  ON commission_consents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. Property owners can view consents for their properties
CREATE POLICY "Property owners can view consents for their properties"
  ON commission_consents FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM properties WHERE user_id = auth.uid()
    )
  );

-- 8. Add trigger for updated_at
CREATE TRIGGER update_commission_consents_updated_at
  BEFORE UPDATE ON commission_consents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. Add comments for documentation
COMMENT ON COLUMN user_profiles.user_type IS 'Type of user: private (Privatperson) or agent (Makler)';
COMMENT ON COLUMN properties.commission_rate IS 'Commission rate as percentage (e.g., 3.57 for 3.57%). Only applicable for properties listed by agents.';
COMMENT ON TABLE commission_consents IS 'Tracks user consent for commission fees and data sharing per property';
