/*
  # Add email test function
  
  1. Changes
    - Add function to test email configuration
    - Add proper error handling
*/

-- Create function to test email configuration
CREATE OR REPLACE FUNCTION test_email_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
  result jsonb;
BEGIN
  -- Get API key from environment
  api_key := current_setting('app.settings.mailersend_api_key', true);
  
  -- Check if API key is configured
  IF api_key IS NULL OR api_key = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'MAILERSEND_API_KEY is not configured'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'api_key_configured', true
  );
END;
$$;