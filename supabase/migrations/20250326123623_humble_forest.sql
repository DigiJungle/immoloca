/*
  # Remove email functionality
  
  1. Changes
    - Drop email-related functions
    - Drop email-related tables
*/

-- Drop email-related functions
DROP FUNCTION IF EXISTS test_email_configuration();
DROP FUNCTION IF EXISTS get_mailersend_api_key();

-- Drop email-related tables if they exist
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;