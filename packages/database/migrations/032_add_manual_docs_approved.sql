-- Migration: Add manual_docs_approved field to document_access_requests
-- This field distinguishes between auto_approved and manual_approval document access

ALTER TABLE document_access_requests
ADD COLUMN IF NOT EXISTS manual_docs_approved BOOLEAN DEFAULT FALSE;

-- Add comment explaining the field
COMMENT ON COLUMN document_access_requests.manual_docs_approved IS
  'Whether the property owner has manually approved access to manual_approval documents';
