-- =====================================================
-- ADD RENOVATION COSTS TO USER PROPERTY PARAMETERS
-- =====================================================
-- Renovierungskosten als zusätzliche Kaufnebenkosten

ALTER TABLE user_property_parameters
ADD COLUMN IF NOT EXISTS renovation_costs NUMERIC(10,2);

COMMENT ON COLUMN user_property_parameters.renovation_costs IS 'Geschätzte Renovierungskosten in EUR (wird zu Kaufnebenkosten addiert)';
