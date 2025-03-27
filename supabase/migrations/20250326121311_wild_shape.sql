/*
  # Fix email configuration

  1. Changes
    - Add proper environment variable handling
    - Add function to validate API key
    - Add function to get API key from environment
*/

-- Function to get MailerSend API key
CREATE OR REPLACE FUNCTION get_mailersend_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  -- Try to get from environment variable first
  BEGIN
    api_key := current_setting('app.settings.mailersend_api_key');
  EXCEPTION WHEN OTHERS THEN
    api_key := NULL;
  END;

  -- If not found in environment, try to get from secrets
  IF api_key IS NULL OR api_key = '' THEN
    BEGIN
      api_key := current_setting('secrets.mailersend_api_key');
    EXCEPTION WHEN OTHERS THEN
      api_key := NULL;
    END;
  END IF;

  RETURN api_key;
END;
$$;

-- Function to test email configuration
CREATE OR REPLACE FUNCTION test_email_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  -- Get API key
  api_key := get_mailersend_api_key();
  
  -- Check if API key is configured
  IF api_key IS NULL OR api_key = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MAILERSEND_API_KEY is not configured',
      'details', 'Please set the MAILERSEND_API_KEY environment variable'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'api_key_configured', true
  );
END;
$$;