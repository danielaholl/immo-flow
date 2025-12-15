-- Migration: Add video_url field to properties table
-- Date: 2025-12-15
-- Description: Adds support for short-form property videos (TikTok-style)

-- Add video_url column to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN properties.video_url IS 'URL to property video (short-form, portrait orientation like TikTok/Instagram)';
