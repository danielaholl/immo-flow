-- Tax Optimizer User Profiles
-- Stores user tax profile and preferences for the Steuer-Optimierer feature
-- Calculates how much real estate investment is needed to reduce tax to 0

CREATE TABLE IF NOT EXISTS tax_optimizer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Tax Profile (User Inputs)
  annual_tax_paid NUMERIC(12,2),              -- Gezahlte Lohnsteuer p.a. (e.g., 30000)
  marginal_tax_rate NUMERIC(5,4) DEFAULT 0.42, -- Persönlicher Grenzsteuersatz (e.g., 0.42 for 42%)

  -- Financing Assumptions (Advanced Settings)
  ltv_ratio NUMERIC(5,4) DEFAULT 1.0,          -- Loan-to-Value / Beleihungsauslauf (1.0 = 100%)
  interest_rate NUMERIC(5,4) DEFAULT 0.04,     -- Zinssatz (0.04 = 4%)
  rental_yield NUMERIC(5,4) DEFAULT 0.03,      -- Mietrendite (0.03 = 3%)
  maintenance_rate NUMERIC(5,4) DEFAULT 0.005, -- Instandhaltungskosten (0.005 = 0.5%)

  -- AfA Strategy Selection
  preferred_strategy TEXT DEFAULT 'bestand'
    CHECK (preferred_strategy IN ('bestand', 'neubau', 'denkmal')),

  -- Cached Calculation Results
  calculated_target_price NUMERIC(14,2),       -- Berechnetes Ziel-Portfolio-Wert
  calculated_annual_savings NUMERIC(12,2),     -- Erwartete jährliche Steuerersparnis
  calculated_monthly_improvement NUMERIC(10,2), -- Monatliche Netto-Verbesserung
  last_calculated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_tax_optimizer_profiles_user ON tax_optimizer_profiles(user_id);

-- Index for property matching queries (find users who need properties in price range)
CREATE INDEX IF NOT EXISTS idx_tax_optimizer_profiles_target_price ON tax_optimizer_profiles(calculated_target_price)
  WHERE calculated_target_price IS NOT NULL;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tax_optimizer_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_tax_optimizer_profiles_updated_at ON tax_optimizer_profiles;
CREATE TRIGGER trigger_update_tax_optimizer_profiles_updated_at
  BEFORE UPDATE ON tax_optimizer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_tax_optimizer_profiles_updated_at();

-- Comment on table
COMMENT ON TABLE tax_optimizer_profiles IS 'Stores user tax optimization profiles for the Steuer-Optimierer feature. Calculates required real estate portfolio to reduce tax burden to zero.';
COMMENT ON COLUMN tax_optimizer_profiles.annual_tax_paid IS 'Annual income tax paid by user in EUR';
COMMENT ON COLUMN tax_optimizer_profiles.marginal_tax_rate IS 'Marginal tax rate as decimal (0.42 = 42%)';
COMMENT ON COLUMN tax_optimizer_profiles.preferred_strategy IS 'AfA depreciation strategy: bestand (2%), neubau (5%), denkmal (9%)';
COMMENT ON COLUMN tax_optimizer_profiles.calculated_target_price IS 'Calculated total portfolio value needed to offset taxes';
