-- =====================================================
-- PORTFOLIO PROPERTIES TABLE
-- =====================================================
-- Stores investor-owned properties for portfolio tracking
-- These are external properties manually added by users

CREATE TABLE IF NOT EXISTS portfolio_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Property Information
  title VARCHAR(200) NOT NULL,
  property_type VARCHAR(50), -- apartment, house, commercial, multi_family
  location VARCHAR(200) NOT NULL,
  postal_code VARCHAR(20),
  street_address VARCHAR(200),

  -- Physical Characteristics
  sqm NUMERIC(10,2) NOT NULL,
  rooms NUMERIC(4,1),
  year_built INTEGER,
  condition VARCHAR(50), -- new, renovated, good, needs_work

  -- Purchase Information
  purchase_date DATE,
  purchase_price NUMERIC(14,2) NOT NULL,
  purchase_costs NUMERIC(12,2), -- Kaufnebenkosten paid
  renovation_costs NUMERIC(12,2), -- Initial renovation investment

  -- Current Valuation
  current_value NUMERIC(14,2), -- Manual or estimated current value
  value_updated_at TIMESTAMPTZ,

  -- Financing Details
  loan_amount NUMERIC(14,2),
  interest_rate NUMERIC(5,3), -- Current interest rate %
  amortization_rate NUMERIC(5,3), -- Tilgung %
  loan_start_date DATE,
  loan_term_years INTEGER,
  fixed_rate_until DATE, -- Zinsbindung end date

  -- Rental Income
  monthly_rent NUMERIC(10,2),
  monthly_fee NUMERIC(10,2), -- Hausgeld
  vacancy_rate NUMERIC(5,2), -- Expected vacancy %

  -- Metadata
  notes TEXT,
  images TEXT[], -- Array of image URLs
  status VARCHAR(20) DEFAULT 'active', -- active, sold, archived

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_properties_user ON portfolio_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_properties_status ON portfolio_properties(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_properties_created ON portfolio_properties(created_at DESC);

-- Comment
COMMENT ON TABLE portfolio_properties IS 'Investor-owned properties for portfolio tracking (manually added)';
