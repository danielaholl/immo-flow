-- Migration: Add investor negotiation advice columns
-- Purpose: Store AI-generated negotiation advice from both OpenAI and Claude

ALTER TABLE user_property_parameters
ADD COLUMN investor_negotiation_openai TEXT,
ADD COLUMN investor_negotiation_claude TEXT,
ADD COLUMN investor_target_price_openai NUMERIC(12,2),
ADD COLUMN investor_target_price_claude NUMERIC(12,2),
ADD COLUMN investor_advice_generated_at TIMESTAMP,
ADD COLUMN investor_advice_inputs_hash VARCHAR(64);

-- Index for efficient cache lookups
CREATE INDEX idx_investor_advice_hash
ON user_property_parameters(user_id, property_id, investor_advice_inputs_hash);

-- Comment for documentation
COMMENT ON COLUMN user_property_parameters.investor_negotiation_openai IS 'OpenAI GPT-4o generated negotiation advice (4-5 sentences)';
COMMENT ON COLUMN user_property_parameters.investor_negotiation_claude IS 'Claude Haiku generated negotiation advice (4-5 sentences)';
COMMENT ON COLUMN user_property_parameters.investor_target_price_openai IS 'OpenAI recommended negotiation target price';
COMMENT ON COLUMN user_property_parameters.investor_target_price_claude IS 'Claude recommended negotiation target price';
COMMENT ON COLUMN user_property_parameters.investor_advice_inputs_hash IS 'SHA-256 hash of calculator inputs for cache validation';
COMMENT ON COLUMN user_property_parameters.investor_advice_generated_at IS 'Timestamp when advice was generated (for cache TTL)';
