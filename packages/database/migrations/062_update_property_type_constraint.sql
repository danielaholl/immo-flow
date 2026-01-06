-- =====================================================
-- UPDATE PROPERTY TYPE CONSTRAINT
-- =====================================================
-- Erweitere property_type constraint von 4 auf 10 Typen

-- Drop alte Constraint aus Migration 005 (nur 4 Typen: apartment, house, villa, commercial)
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;

-- Neue Constraint mit allen 10 Typen
ALTER TABLE properties
ADD CONSTRAINT properties_property_type_check
CHECK (property_type IN (
  'apartment',      -- Wohnung
  'house',          -- Haus
  'villa',          -- Villa
  'multi_family',   -- Mehrfamilienhaus
  'land',           -- Grundstück
  'commercial',     -- Gewerbe
  'office',         -- Büro
  'retail',         -- Einzelhandel
  'industrial',     -- Industrie
  'parking'         -- Stellplatz/Garage
));

-- Gleiche Änderung für portfolio_properties Tabelle
ALTER TABLE portfolio_properties DROP CONSTRAINT IF EXISTS portfolio_properties_property_type_check;

ALTER TABLE portfolio_properties
ADD CONSTRAINT portfolio_properties_property_type_check
CHECK (property_type IN (
  'apartment',
  'house',
  'villa',
  'multi_family',
  'land',
  'commercial',
  'office',
  'retail',
  'industrial',
  'parking'
));

-- Kommentar hinzufügen
COMMENT ON CONSTRAINT properties_property_type_check ON properties IS
'Property type constraint - supports 10 types: residential (apartment, house, villa, multi_family), land, commercial (commercial, office, retail, industrial), and parking';

COMMENT ON CONSTRAINT portfolio_properties_property_type_check ON portfolio_properties IS
'Property type constraint - supports 10 types: residential (apartment, house, villa, multi_family), land, commercial (commercial, office, retail, industrial), and parking';
