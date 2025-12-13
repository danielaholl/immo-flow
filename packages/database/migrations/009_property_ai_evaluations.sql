-- Migration 009: Create property_ai_evaluations table
-- This table stores AI-powered investment evaluations for properties

CREATE TABLE IF NOT EXISTS property_ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Evaluation scores
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  color_rating TEXT NOT NULL CHECK (color_rating IN ('green', 'yellow', 'red')),
  location_score INTEGER CHECK (location_score >= 0 AND location_score <= 100),
  price_score INTEGER CHECK (price_score >= 0 AND price_score <= 100),
  yield_score INTEGER CHECK (yield_score >= 0 AND yield_score <= 100),
  appreciation_score INTEGER CHECK (appreciation_score >= 0 AND appreciation_score <= 100),
  features_score INTEGER CHECK (features_score >= 0 AND features_score <= 100),

  -- AI analysis text
  ai_reasoning TEXT,
  market_analysis TEXT,
  rent_analysis TEXT,
  financing_analysis TEXT,

  -- Financial metrics
  estimated_monthly_rent NUMERIC(10, 2),
  estimated_yearly_rent NUMERIC(10, 2),
  gross_yield_percentage NUMERIC(5, 2),
  price_per_sqm NUMERIC(10, 2),
  market_average_price_per_sqm NUMERIC(10, 2),
  interest_rate_90 NUMERIC(5, 2),
  interest_rate_80 NUMERIC(5, 2),

  -- Metadata
  ai_model TEXT,
  evaluation_version TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(property_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_ai_evaluations_property_id ON property_ai_evaluations(property_id);
