-- Add appreciation_rate column to portfolio_properties
-- This stores the calculated annual value appreciation rate per property
-- Formula: ((current_value / purchase_price) ^ (1/years)) - 1

ALTER TABLE portfolio_properties
ADD COLUMN IF NOT EXISTS appreciation_rate_pa NUMERIC(5,2) DEFAULT 1.0;

-- Add comment explaining the column
COMMENT ON COLUMN portfolio_properties.appreciation_rate_pa IS 'Annual appreciation rate in % calculated from (current_value - purchase_price) / years. Default 1.0% if no current value.';
