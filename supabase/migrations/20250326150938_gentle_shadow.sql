/*
  # Remove email templates files
  
  1. Changes
    - Remove email templates files
    - Clean up email-related tables and functions
*/

-- Drop email-related tables if they exist
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;

-- Drop email-related functions if they exist
DROP FUNCTION IF EXISTS send_application_email CASCADE;
DROP FUNCTION IF EXISTS handle_email_notification CASCADE;