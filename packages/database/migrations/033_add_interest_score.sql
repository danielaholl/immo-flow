-- Migration: Add interest_score to document_access_requests
-- This field stores the KI-calculated interest score (0-10) for each requester

ALTER TABLE document_access_requests
ADD COLUMN IF NOT EXISTS interest_score INTEGER DEFAULT NULL;

-- Add check constraint to ensure score is between 0 and 10
ALTER TABLE document_access_requests
ADD CONSTRAINT interest_score_range CHECK (interest_score IS NULL OR (interest_score >= 0 AND interest_score <= 10));
