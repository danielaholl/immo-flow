-- Migration: 031_document_access_control.sql
-- Description: Adds document access control system for protected documents
-- Date: 2025-12-18

-- 1. Add document_release_mode column to properties
-- Controls how protected documents are released: 'automatic' (instant after consent) or 'manual' (broker approval required)
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS document_release_mode VARCHAR(20) DEFAULT 'automatic'
CHECK (document_release_mode IN ('automatic', 'manual'));

COMMENT ON COLUMN properties.document_release_mode IS 'How protected documents are released: automatic (instant after consent) or manual (broker approval required)';

-- 2. Create document_access_requests table
-- Tracks user requests for access to protected documents
CREATE TABLE IF NOT EXISTS document_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'denied')),
    -- Snapshot of user data at request time (for broker reference)
    user_first_name VARCHAR(100),
    user_last_name VARCHAR(100),
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    -- Optional broker response message
    broker_response_message TEXT,
    -- Unique constraint: one request per user per property
    UNIQUE(property_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_document_access_requests_property
ON document_access_requests(property_id);

CREATE INDEX IF NOT EXISTS idx_document_access_requests_user
ON document_access_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_document_access_requests_status
ON document_access_requests(property_id, status);

COMMENT ON TABLE document_access_requests IS 'Tracks user requests for access to protected property documents';
