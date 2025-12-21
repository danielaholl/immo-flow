-- Migration: 038_subscriptions.sql
-- Description: Add subscriptions and payment_events tables for Stripe integration

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Stripe IDs
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Plan Info
  plan_type TEXT NOT NULL DEFAULT 'free', -- 'free', 'investor', 'pro', 'sucher', 'makler_pro', 'makler_enterprise'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', 'incomplete'

  -- Billing Period
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);

-- ============================================================================
-- PAYMENT EVENTS TABLE (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_events_user ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON payment_events(processed_at);

-- ============================================================================
-- ONE-TIME PAYMENTS TABLE (for Verkäufer plans)
-- ============================================================================

CREATE TABLE IF NOT EXISTS one_time_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,

  -- Payment details
  product_type TEXT NOT NULL, -- 'verkauf_starter', 'verkauf_premium', 'verkauf_erfolg'
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'failed', 'refunded'

  -- For Erfolgspaket (success fee)
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  success_fee_percentage DECIMAL(5,2), -- e.g., 0.50 for 0.5%

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_one_time_payments_user ON one_time_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_one_time_payments_status ON one_time_payments(status);
CREATE INDEX IF NOT EXISTS idx_one_time_payments_property ON one_time_payments(property_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get user's current plan
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_plan(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan_type INTO v_plan
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  LIMIT 1;

  RETURN COALESCE(v_plan, 'free');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE subscriptions IS 'Stores user subscription information synced with Stripe';
COMMENT ON TABLE payment_events IS 'Audit log of all Stripe webhook events for debugging and compliance';
COMMENT ON TABLE one_time_payments IS 'Tracks one-time payments for Verkäufer plans';
COMMENT ON FUNCTION get_user_plan IS 'Returns the current active plan for a user, defaults to free';
