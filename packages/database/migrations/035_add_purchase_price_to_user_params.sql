-- =====================================================
-- ADD PURCHASE PRICE TO USER PROPERTY PARAMETERS
-- =====================================================
-- Ermöglicht das Überschreiben des Kaufpreises für individuelle Berechnungen

ALTER TABLE user_property_parameters
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2);

COMMENT ON COLUMN user_property_parameters.purchase_price IS 'Benutzerdefinierter Kaufpreis in EUR (überschreibt Property-Kaufpreis für Berechnungen)';
