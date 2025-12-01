-- Reset all consent data to false

-- Set global_address_consent to false for all users
UPDATE user_profiles SET global_address_consent = false;

-- Delete all property-specific consents
DELETE FROM property_consents;
