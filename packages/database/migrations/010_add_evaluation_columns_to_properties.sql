-- Migration 010: Add evaluation columns to properties table
-- These columns are needed by the property-investment-evaluator service

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS ai_investment_score INTEGER CHECK (ai_investment_score >= 0 AND ai_investment_score <= 100),
  ADD COLUMN IF NOT EXISTS score_color TEXT CHECK (score_color IN ('green', 'yellow', 'red')),
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS score_calculated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS ai_detailed_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS buyer_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS seller_analysis JSONB,
  ADD COLUMN IF NOT EXISTS expose_text TEXT,
  ADD COLUMN IF NOT EXISTS energy_efficiency_class TEXT,
  ADD COLUMN IF NOT EXISTS important_notes TEXT;

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_properties_ai_investment_score ON properties(ai_investment_score DESC);
CREATE INDEX IF NOT EXISTS idx_properties_score_color ON properties(score_color);
