-- =====================================================
-- ADD CALCULATED METRICS TO USER PROPERTY PARAMETERS
-- =====================================================
-- Speichert die berechneten Kennzahlen (Rendite, Faktor, Cashflow)

ALTER TABLE user_property_parameters
ADD COLUMN IF NOT EXISTS calculated_gross_yield NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS calculated_rent_multiplier NUMERIC(5,1),
ADD COLUMN IF NOT EXISTS calculated_monthly_cashflow NUMERIC(10,2);

COMMENT ON COLUMN user_property_parameters.calculated_gross_yield IS 'Berechnete Brutto-Rendite in % (Jahresmiete / Kaufpreis * 100)';
COMMENT ON COLUMN user_property_parameters.calculated_rent_multiplier IS 'Berechneter Faktor (Kaufpreis / Jahresmiete)';
COMMENT ON COLUMN user_property_parameters.calculated_monthly_cashflow IS 'Berechneter monatlicher Cashflow in EUR (Miete - Hausgeld - Kreditrate)';
