-- =====================================================
-- PORTFOLIO VALUE HISTORY TABLE
-- =====================================================
-- Tracks historical values for portfolio properties
-- Used for charts and performance tracking (Pro feature)

CREATE TABLE IF NOT EXISTS portfolio_value_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_property_id UUID NOT NULL REFERENCES portfolio_properties(id) ON DELETE CASCADE,

  -- Value snapshot
  property_value NUMERIC(14,2) NOT NULL,
  monthly_rent NUMERIC(10,2),
  remaining_loan NUMERIC(14,2),

  -- Source of value
  source VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, ai_estimate, appraisal

  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_value_history_property ON portfolio_value_history(portfolio_property_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_value_history_date ON portfolio_value_history(recorded_at DESC);

-- Comment
COMMENT ON TABLE portfolio_value_history IS 'Historical value snapshots for portfolio properties (Pro feature)';

-- Trigger to auto-record initial value when property is created
CREATE OR REPLACE FUNCTION record_initial_portfolio_value()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_value IS NOT NULL THEN
    INSERT INTO portfolio_value_history (
      portfolio_property_id,
      property_value,
      monthly_rent,
      remaining_loan,
      source
    ) VALUES (
      NEW.id,
      COALESCE(NEW.current_value, NEW.purchase_price),
      NEW.monthly_rent,
      NEW.loan_amount,
      'manual'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER portfolio_property_initial_value
  AFTER INSERT ON portfolio_properties
  FOR EACH ROW
  EXECUTE FUNCTION record_initial_portfolio_value();
