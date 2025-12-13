-- =====================================================
-- MESSAGING HELPER FUNCTIONS
-- =====================================================
-- Migration 015: Add helper functions for messaging system

-- Function to reset unread count for a user in a conversation
CREATE OR REPLACE FUNCTION reset_unread_count(
  p_conversation_id UUID,
  p_user_profile_id UUID,
  p_user_role TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Reset the appropriate unread count based on user role
  IF p_user_role = 'buyer' THEN
    UPDATE conversations
    SET buyer_unread_count = 0
    WHERE id = p_conversation_id;
  ELSIF p_user_role = 'seller' THEN
    UPDATE conversations
    SET seller_unread_count = 0
    WHERE id = p_conversation_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_unread_count IS 'Reset unread message count for a user in a conversation';

-- Function to increment unread count when a message is sent
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
DECLARE
  v_buyer_id UUID;
  v_seller_id UUID;
BEGIN
  -- Get buyer and seller IDs from the conversation
  SELECT buyer_id, seller_id INTO v_buyer_id, v_seller_id
  FROM conversations
  WHERE id = NEW.conversation_id;

  -- Increment unread count for the recipient
  IF NEW.sender_type = 'buyer' OR NEW.sender_type = 'ai' THEN
    -- Message from buyer or AI - increment seller's unread count
    UPDATE conversations
    SET seller_unread_count = seller_unread_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_type = 'seller' THEN
    -- Message from seller - increment buyer's unread count
    UPDATE conversations
    SET buyer_unread_count = buyer_unread_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_unread_count IS 'Automatically increment unread count when a new message is inserted';

-- Create trigger for incrementing unread count
DROP TRIGGER IF EXISTS trigger_increment_unread_count ON messages;
CREATE TRIGGER trigger_increment_unread_count
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Function to get total unread count for a user
CREATE OR REPLACE FUNCTION get_user_unread_count(p_user_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_unread INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(buyer_unread_count), 0) + COALESCE(SUM(seller_unread_count), 0)
  INTO v_total_unread
  FROM conversations
  WHERE buyer_id = p_user_profile_id OR seller_id = p_user_profile_id;

  -- Return only the unread count for the requesting user
  SELECT
    COALESCE(SUM(
      CASE
        WHEN buyer_id = p_user_profile_id THEN buyer_unread_count
        WHEN seller_id = p_user_profile_id THEN seller_unread_count
        ELSE 0
      END
    ), 0)
  INTO v_total_unread
  FROM conversations
  WHERE buyer_id = p_user_profile_id OR seller_id = p_user_profile_id;

  RETURN v_total_unread;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_unread_count IS 'Get total unread message count for a user across all conversations';
