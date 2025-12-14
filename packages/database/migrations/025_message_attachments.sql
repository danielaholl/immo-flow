-- =====================================================
-- MESSAGE ATTACHMENTS
-- =====================================================
-- Migration 025: Add attachments column to messages table

-- Add attachments column as JSONB array
-- Each attachment: { url: string, type: string, name: string, size?: number }
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add index for messages with attachments
CREATE INDEX IF NOT EXISTS idx_messages_has_attachments
  ON messages ((attachments != '[]'::jsonb));

COMMENT ON COLUMN messages.attachments IS 'Array of file attachments: [{url, type, name, size}]';
