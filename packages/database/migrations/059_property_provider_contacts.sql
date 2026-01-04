-- Migration: 059_property_provider_contacts.sql
-- Description: Stores provider contact information for imported properties
-- Date: 2025-01-04

-- Speichert Anbieter-Kontaktdaten für importierte Properties
CREATE TABLE IF NOT EXISTS property_provider_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  provider_name TEXT,
  provider_email TEXT,
  provider_phone TEXT,
  provider_company TEXT,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE,
  invitation_accepted_at TIMESTAMP WITH TIME ZONE,
  linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_provider_per_property UNIQUE(property_id),
  CONSTRAINT valid_email CHECK (provider_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_provider_contacts_email ON property_provider_contacts(provider_email);
CREATE INDEX IF NOT EXISTS idx_provider_contacts_property ON property_provider_contacts(property_id);
CREATE INDEX IF NOT EXISTS idx_provider_contacts_linked_user ON property_provider_contacts(linked_user_id);

COMMENT ON TABLE property_provider_contacts IS 'Stores provider contact information for imported properties';
