-- =====================================================
-- PROPERTY INTERACTION COUNTS
-- =====================================================
-- Migration 061: Add counter columns for property interactions
-- This migration adds columns to track interaction counts (conversations, shares, dismissed)
-- and creates triggers to keep them updated automatically.

-- Add columns to properties table for caching counts
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS conversations_count INTEGER DEFAULT 0 CHECK (conversations_count >= 0),
  ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0 CHECK (shares_count >= 0),
  ADD COLUMN IF NOT EXISTS dismissed_count INTEGER DEFAULT 0 CHECK (dismissed_count >= 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_interactions_share
  ON property_interactions(property_id, interaction_type)
  WHERE interaction_type = 'share';

CREATE INDEX IF NOT EXISTS idx_conversations_property_count
  ON conversations(property_id);

CREATE INDEX IF NOT EXISTS idx_dismissed_properties_count
  ON user_dismissed_properties(property_id);

-- =====================================================
-- CONVERSATIONS COUNT TRIGGER
-- =====================================================

-- Function to update conversations count
CREATE OR REPLACE FUNCTION update_property_conversations_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE properties
    SET conversations_count = conversations_count + 1
    WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE properties
    SET conversations_count = GREATEST(0, conversations_count - 1)
    WHERE id = OLD.property_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversations count
DROP TRIGGER IF EXISTS trigger_update_property_conversations_count ON conversations;
CREATE TRIGGER trigger_update_property_conversations_count
  AFTER INSERT OR DELETE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_property_conversations_count();

-- =====================================================
-- SHARES COUNT TRIGGER
-- =====================================================

-- Function to update shares count
CREATE OR REPLACE FUNCTION update_property_shares_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.interaction_type = 'share' THEN
    UPDATE properties
    SET shares_count = shares_count + 1
    WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' AND OLD.interaction_type = 'share' THEN
    UPDATE properties
    SET shares_count = GREATEST(0, shares_count - 1)
    WHERE id = OLD.property_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for shares count
DROP TRIGGER IF EXISTS trigger_update_property_shares_count ON property_interactions;
CREATE TRIGGER trigger_update_property_shares_count
  AFTER INSERT OR DELETE ON property_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_property_shares_count();

-- =====================================================
-- DISMISSED COUNT TRIGGER
-- =====================================================

-- Function to update dismissed count
CREATE OR REPLACE FUNCTION update_property_dismissed_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE properties
    SET dismissed_count = dismissed_count + 1
    WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE properties
    SET dismissed_count = GREATEST(0, dismissed_count - 1)
    WHERE id = OLD.property_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for dismissed count
DROP TRIGGER IF EXISTS trigger_update_property_dismissed_count ON user_dismissed_properties;
CREATE TRIGGER trigger_update_property_dismissed_count
  AFTER INSERT OR DELETE ON user_dismissed_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_property_dismissed_count();

-- =====================================================
-- BACKFILL EXISTING COUNTS
-- =====================================================

-- Backfill existing counts for all properties
UPDATE properties p SET
  conversations_count = (
    SELECT COUNT(DISTINCT c.id)::INTEGER
    FROM conversations c
    WHERE c.property_id = p.id
  ),
  shares_count = (
    SELECT COUNT(*)::INTEGER
    FROM property_interactions pi
    WHERE pi.property_id = p.id AND pi.interaction_type = 'share'
  ),
  dismissed_count = (
    SELECT COUNT(*)::INTEGER
    FROM user_dismissed_properties udp
    WHERE udp.property_id = p.id
  );

-- Add column comments for documentation
COMMENT ON COLUMN properties.conversations_count IS 'Number of conversations started for this property';
COMMENT ON COLUMN properties.shares_count IS 'Number of times this property was shared';
COMMENT ON COLUMN properties.dismissed_count IS 'Number of users who marked this property as not interested';
