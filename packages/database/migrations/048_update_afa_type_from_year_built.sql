-- Migration: Update afa_type based on year_built for existing properties
-- This ensures all properties have the correct AfA type based on their construction year

-- Update existing properties to calculate afa_type from year_built
-- Denkmal properties are preserved (only set explicitly)
UPDATE properties
SET afa_type = CASE
  WHEN afa_type = 'denkmal' THEN 'denkmal'  -- Denkmal bleibt erhalten
  WHEN year_built IS NULL THEN 'bestand'    -- Kein Baujahr -> Default
  WHEN year_built < 1925 THEN 'altbau'      -- Vor 1925 -> 2.5% AfA
  WHEN year_built >= 2024 THEN 'neubau'     -- Ab 2024 -> 5% degressive AfA
  ELSE 'bestand'                             -- 1925-2023 -> 2% AfA
END
WHERE afa_type IS NULL
   OR (afa_type != 'denkmal' AND afa_type != CASE
        WHEN year_built IS NULL THEN 'bestand'
        WHEN year_built < 1925 THEN 'altbau'
        WHEN year_built >= 2024 THEN 'neubau'
        ELSE 'bestand'
      END);
