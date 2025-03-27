/*
  # Clean up email system

  1. Changes
    - Drop Edge function if it exists
    - Clean up any remaining email configuration
*/

-- Drop functions if they exist
DO $$ 
BEGIN
  -- Drop email-related functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'send_email') THEN
    DROP FUNCTION send_email CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_email_notification') THEN
    DROP FUNCTION handle_email_notification CASCADE;
  END IF;

  -- Clean up any remaining email configuration
  BEGIN
    PERFORM set_config('app.settings.mailersend_api_key', '', true);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  
  BEGIN
    PERFORM set_config('secrets.mailersend_api_key', '', true);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;