/*
  # Clean up email system
  
  1. Changes
    - Drop email related tables
    - Drop email related functions
    - Drop email related triggers
*/

-- Drop email related tables
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;

-- Drop email related functions
DROP FUNCTION IF EXISTS send_group_visit_emails CASCADE;
DROP FUNCTION IF EXISTS handle_email_notification CASCADE;

-- Drop http extension and net schema
DROP SCHEMA IF EXISTS net CASCADE;
DROP EXTENSION IF EXISTS http CASCADE;

-- Remove email related columns from notifications
ALTER TABLE notifications 
DROP COLUMN IF EXISTS subject,
DROP COLUMN IF EXISTS content_html,
DROP COLUMN IF EXISTS content_text;