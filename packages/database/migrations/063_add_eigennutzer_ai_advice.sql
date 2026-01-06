-- Migration: Add eigennutzer AI advice columns
-- Purpose: Store AI-generated buy-vs-rent advice from both OpenAI and Claude

ALTER TABLE user_property_parameters
ADD COLUMN eigennutzer_advice_openai TEXT,
ADD COLUMN eigennutzer_advice_claude TEXT,
ADD COLUMN eigennutzer_recommendation_openai VARCHAR(50),
ADD COLUMN eigennutzer_recommendation_claude VARCHAR(50),
ADD COLUMN eigennutzer_advice_generated_at TIMESTAMP,
ADD COLUMN eigennutzer_advice_inputs_hash VARCHAR(64);

-- Index for efficient cache lookups
CREATE INDEX idx_eigennutzer_advice_hash
ON user_property_parameters(user_id, property_id, eigennutzer_advice_inputs_hash);

-- Comments for documentation
COMMENT ON COLUMN user_property_parameters.eigennutzer_advice_openai IS 'OpenAI generated buy-vs-rent advice for owner-occupiers';
COMMENT ON COLUMN user_property_parameters.eigennutzer_advice_claude IS 'Claude generated buy-vs-rent advice for owner-occupiers';
COMMENT ON COLUMN user_property_parameters.eigennutzer_recommendation_openai IS 'OpenAI recommendation: KAUFEN, MIETEN, or AUSGEGLICHEN';
COMMENT ON COLUMN user_property_parameters.eigennutzer_recommendation_claude IS 'Claude recommendation: KAUFEN, MIETEN, or AUSGEGLICHEN';
COMMENT ON COLUMN user_property_parameters.eigennutzer_advice_inputs_hash IS 'SHA-256 hash of calculator inputs for cache validation';
COMMENT ON COLUMN user_property_parameters.eigennutzer_advice_generated_at IS 'Timestamp when advice was generated (for cache TTL)';
