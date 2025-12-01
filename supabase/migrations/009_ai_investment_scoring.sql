-- =====================================================
-- AI INVESTMENT SCORING SYSTEM
-- Automated property evaluation from investor perspective
-- =====================================================

-- Add AI score columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS ai_investment_score INTEGER CHECK (ai_investment_score >= 0 AND ai_investment_score <= 100),
ADD COLUMN IF NOT EXISTS score_color TEXT CHECK (score_color IN ('green', 'yellow', 'red')),
ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS score_calculated_at TIMESTAMP WITH TIME ZONE;

-- Create detailed evaluations table for history and transparency
CREATE TABLE IF NOT EXISTS property_ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Overall score and color
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  color_rating TEXT NOT NULL CHECK (color_rating IN ('green', 'yellow', 'red')),

  -- Individual scores (0-100 each)
  location_score INTEGER NOT NULL CHECK (location_score >= 0 AND location_score <= 100),
  price_score INTEGER NOT NULL CHECK (price_score >= 0 AND price_score <= 100),
  yield_score INTEGER NOT NULL CHECK (yield_score >= 0 AND yield_score <= 100),
  appreciation_score INTEGER NOT NULL CHECK (appreciation_score >= 0 AND appreciation_score <= 100),
  features_score INTEGER NOT NULL CHECK (features_score >= 0 AND features_score <= 100),

  -- AI reasoning and details
  ai_reasoning TEXT,
  location_analysis TEXT,
  market_analysis TEXT,

  -- Calculated metrics
  estimated_monthly_rent NUMERIC(10, 2),
  estimated_yearly_rent NUMERIC(10, 2),
  gross_yield_percentage NUMERIC(5, 2),
  price_per_sqm NUMERIC(10, 2),

  -- Metadata
  ai_model TEXT DEFAULT 'gpt-4',
  evaluation_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_ai_score ON properties(ai_investment_score DESC) WHERE ai_investment_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_score_color ON properties(score_color) WHERE score_color IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_property ON property_ai_evaluations(property_id);
CREATE INDEX IF NOT EXISTS idx_ai_evaluations_created ON property_ai_evaluations(created_at DESC);

-- Enable RLS
ALTER TABLE property_ai_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_ai_evaluations
CREATE POLICY "Anyone can view evaluations"
  ON property_ai_evaluations FOR SELECT
  USING (true);

CREATE POLICY "Only service role can insert evaluations"
  ON property_ai_evaluations FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Only service role can update evaluations"
  ON property_ai_evaluations FOR UPDATE
  USING (auth.role() = 'service_role');

-- Function to get latest evaluation for a property
CREATE OR REPLACE FUNCTION get_latest_evaluation(target_property_id UUID)
RETURNS property_ai_evaluations AS $$
  SELECT *
  FROM property_ai_evaluations
  WHERE property_id = target_property_id
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Grant permissions
GRANT SELECT ON property_ai_evaluations TO authenticated;
GRANT SELECT ON property_ai_evaluations TO anon;
GRANT ALL ON property_ai_evaluations TO service_role;

GRANT EXECUTE ON FUNCTION get_latest_evaluation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_evaluation(UUID) TO anon;

COMMENT ON TABLE property_ai_evaluations IS 'AI-powered investment evaluations for properties';
COMMENT ON COLUMN properties.ai_investment_score IS 'Overall AI investment score (0-100)';
COMMENT ON COLUMN properties.score_color IS 'Color rating: green (70-100), yellow (40-69), red (0-39)';
COMMENT ON COLUMN properties.score_breakdown IS 'Detailed breakdown of individual scores';
