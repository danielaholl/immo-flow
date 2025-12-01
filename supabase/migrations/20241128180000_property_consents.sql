-- Create property_consents table for per-property consent tracking
-- This allows users to consent to see addresses for specific properties

CREATE TABLE IF NOT EXISTS property_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one consent per user per property
  UNIQUE(user_id, property_id)
);

-- Enable RLS
ALTER TABLE property_consents ENABLE ROW LEVEL SECURITY;

-- Users can view their own consents
CREATE POLICY "Users can view their own consents"
  ON property_consents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own consents
CREATE POLICY "Users can create their own consents"
  ON property_consents FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own consents
CREATE POLICY "Users can delete their own consents"
  ON property_consents FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_consents_user_id ON property_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_property_consents_property_id ON property_consents(property_id);

-- Rename existing address_consent to global_address_consent for clarity
-- This field now represents "consent for ALL properties"
ALTER TABLE user_profiles
  RENAME COLUMN address_consent TO global_address_consent;
