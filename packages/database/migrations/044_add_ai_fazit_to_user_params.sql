-- Migration: Add AI Fazit columns to user_property_parameters
-- Purpose: Persist AI-generated analysis to avoid regenerating on each page load

ALTER TABLE user_property_parameters
ADD COLUMN IF NOT EXISTS investor_fazit_text TEXT,
ADD COLUMN IF NOT EXISTS investor_fazit_tips JSONB,
ADD COLUMN IF NOT EXISTS investor_fazit_verdict TEXT,
ADD COLUMN IF NOT EXISTS eigennutzer_fazit_text TEXT,
ADD COLUMN IF NOT EXISTS eigennutzer_fazit_tips JSONB,
ADD COLUMN IF NOT EXISTS eigennutzer_fazit_verdict TEXT,
ADD COLUMN IF NOT EXISTS fazit_generated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN user_property_parameters.investor_fazit_text IS 'Cached AI analysis text for investor mode';
COMMENT ON COLUMN user_property_parameters.investor_fazit_tips IS 'Array of optimization tips for investor mode';
COMMENT ON COLUMN user_property_parameters.investor_fazit_verdict IS 'positive, neutral, or negative verdict';
COMMENT ON COLUMN user_property_parameters.eigennutzer_fazit_text IS 'Cached AI analysis text for owner-occupier mode';
COMMENT ON COLUMN user_property_parameters.eigennutzer_fazit_tips IS 'Array of optimization tips for owner-occupier mode';
COMMENT ON COLUMN user_property_parameters.eigennutzer_fazit_verdict IS 'positive, neutral, or negative verdict';
COMMENT ON COLUMN user_property_parameters.fazit_generated_at IS 'Timestamp when the AI fazit was last generated';
