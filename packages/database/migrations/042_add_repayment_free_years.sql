-- Add repayment_free_years column to portfolio_properties
-- During repayment-free period, only interest is paid (no amortization)

ALTER TABLE portfolio_properties
ADD COLUMN IF NOT EXISTS repayment_free_years INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN portfolio_properties.repayment_free_years IS 'Number of years with no amortization (only interest payments). Used to calculate current debt service.';
