/*
  # Clean up notifications table

  1. Changes
    - Remove unused columns (content_html, content_text, subject)
    - Keep only essential fields for application notifications
*/

-- Remove unused columns
ALTER TABLE notifications 
DROP COLUMN IF EXISTS content_html,
DROP COLUMN IF EXISTS content_text,
DROP COLUMN IF EXISTS subject;

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications with minimal required fields';