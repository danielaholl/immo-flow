-- =====================================================
-- EXTEND PROPERTIES TABLE
-- =====================================================
-- Add new fields for comprehensive property information

-- Property Type & Location Details
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('apartment', 'house', 'villa', 'commercial')),
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS street_address TEXT;

-- Building & Floor Information
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS total_floors INTEGER CHECK (total_floors > 0),
ADD COLUMN IF NOT EXISTS floor_level TEXT; -- EG, DG, 1. OG, 2. OG, etc.

-- Area Information
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS usable_area INTEGER CHECK (usable_area >= 0),
ADD COLUMN IF NOT EXISTS usable_area_ratio TEXT; -- '1/2', '1/4', '1/1', etc.

-- Room Details
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS bathrooms INTEGER CHECK (bathrooms >= 0);

-- Condition & Availability
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('new', 'first_occupancy', 'renovated', 'maintained', 'needs_renovation'));

-- Financial Details
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS monthly_fee INTEGER CHECK (monthly_fee >= 0), -- Hausgeld
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100),
ADD COLUMN IF NOT EXISTS require_address_consent BOOLEAN DEFAULT false;

-- Building Information
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS year_built INTEGER CHECK (year_built >= 1800 AND year_built <= EXTRACT(YEAR FROM NOW()) + 5);

-- Energy & Heating
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS heating_type TEXT CHECK (heating_type IN ('central', 'floor', 'gas', 'oil', 'district', 'electric', 'solar', 'heat_pump', 'other')),
ADD COLUMN IF NOT EXISTS energy_source TEXT CHECK (energy_source IN ('gas', 'oil', 'electricity', 'district_heating', 'solar', 'geothermal', 'biomass', 'other')),
ADD COLUMN IF NOT EXISTS energy_certificate TEXT CHECK (energy_certificate IN ('demand', 'consumption', 'none'));

-- User Association
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add indexes for new searchable fields
CREATE INDEX IF NOT EXISTS properties_property_type_idx ON properties(property_type);
CREATE INDEX IF NOT EXISTS properties_postal_code_idx ON properties(postal_code);
CREATE INDEX IF NOT EXISTS properties_condition_idx ON properties(condition);
CREATE INDEX IF NOT EXISTS properties_year_built_idx ON properties(year_built);
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON properties(user_id);

-- Add comment
COMMENT ON TABLE properties IS 'Extended property information including detailed building, energy, and financial data';
