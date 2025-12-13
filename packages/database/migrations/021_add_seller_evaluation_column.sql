-- Migration 021: Add seller_evaluation column to properties table
-- This column stores AI-powered seller evaluation data as JSON

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS seller_evaluation JSONB;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_seller_evaluation ON properties USING gin(seller_evaluation);
