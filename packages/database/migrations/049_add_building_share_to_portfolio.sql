-- Migration: Add building_share column to portfolio_properties table
-- This is needed for AfA (depreciation) calculation

ALTER TABLE portfolio_properties
ADD COLUMN IF NOT EXISTS building_share NUMERIC(5,4) DEFAULT 0.80;

COMMENT ON COLUMN portfolio_properties.building_share IS 'Gebäudeanteil für AfA-Berechnung (z.B. 0.80 = 80%)';
