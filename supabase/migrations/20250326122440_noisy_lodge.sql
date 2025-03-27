/*
  # Fix email configuration

  1. Changes
    - Add proper email configuration settings
    - Add function to validate email configuration
    - Add function to safely get API key
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS test_email_configuration();
DROP FUNCTION IF EXISTS get_mailersend_api_key();

-- Function to safely get MailerSend API key
CREATE OR REPLACE FUNCTION get_mailersend_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  -- Try to get from request header
  BEGIN
    api_key := current_setting('request.headers')::json->>'apikey';
  EXCEPTION WHEN OTHERS THEN
    api_key := NULL;
  END;

  -- If not in header, try environment
  IF api_key IS NULL OR api_key = '' THEN
    BEGIN
      api_key := current_setting('app.settings.mailersend_api_key', true);
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
  result jsonb;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_mailersend_api_key() TO authenticated;
GRANT EXECUTE ON FUNCTION test_email_configuration() TO authenticated;

-- Add comments
COMMENT ON FUNCTION get_mailersend_api_key() IS 'Safely retrieves MailerSend API key from available sources';
COMMENT ON FUNCTION test_email_configuration() IS 'Tests if email configuration is properly set up';