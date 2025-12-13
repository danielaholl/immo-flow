-- Migration 009: Add missing columns to property_ai_evaluations table
-- This migration adds the columns that the property-investment-evaluator expects

ALTER TABLE property_ai_evaluations
  ADD COLUMN IF NOT EXISTS overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  ADD COLUMN IF NOT EXISTS color_rating TEXT CHECK (color_rating IN ('green', 'yellow', 'red')),
  ADD COLUMN IF NOT EXISTS location_score INTEGER CHECK (location_score >= 0 AND location_score <= 100),
  ADD COLUMN IF NOT EXISTS price_score INTEGER CHECK (price_score >= 0 AND price_score <= 100),
  ADD COLUMN IF NOT EXISTS yield_score INTEGER CHECK (yield_score >= 0 AND yield_score <= 100),
  ADD COLUMN IF NOT EXISTS appreciation_score INTEGER CHECK (appreciation_score >= 0 AND appreciation_score <= 100),
  ADD COLUMN IF NOT EXISTS features_score INTEGER CHECK (features_score >= 0 AND features_score <= 100),
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS rent_analysis TEXT,
  ADD COLUMN IF NOT EXISTS financing_analysis TEXT,
  ADD COLUMN IF NOT EXISTS estimated_monthly_rent NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS estimated_yearly_rent NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS gross_yield_percentage NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS price_per_sqm NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS market_average_price_per_sqm NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS interest_rate_90 NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS interest_rate_80 NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS evaluation_version TEXT;
