-- Add require_address_consent field to properties table
ALTER TABLE properties
ADD COLUMN require_address_consent BOOLEAN DEFAULT false;

COMMENT ON COLUMN properties.require_address_consent IS 'Whether address should only be shown after consent/commission agreement';
