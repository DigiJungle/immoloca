/*
  # Fix email notification system

  1. Changes
    - Drop and recreate http extension
    - Create net schema and functions properly
    - Add proper error handling
*/

-- Drop existing objects to avoid conflicts
DROP SCHEMA IF EXISTS net CASCADE;
DROP EXTENSION IF EXISTS http CASCADE;

-- Enable http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create net schema
CREATE SCHEMA IF NOT EXISTS net;

-- Create http_post function in net schema with proper error handling
CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  body text DEFAULT NULL,
  params jsonb DEFAULT NULL,
  headers jsonb DEFAULT NULL
)
RETURNS http_response
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result http_response;
BEGIN
  -- Validate input
  IF url IS NULL THEN
    RAISE EXCEPTION 'URL cannot be null';
  END IF;

  -- Make HTTP request with error handling
  BEGIN
    SELECT * INTO result FROM http_post(
      url := url,
      body := body,
      params := params,
      headers := headers
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE NOTICE 'HTTP request failed: %', SQLERRM;
    RAISE;
  END;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT USAGE ON SCHEMA net TO authenticated;
GRANT EXECUTE ON FUNCTION net.http_post TO authenticated;

-- Add comment
COMMENT ON FUNCTION net.http_post IS 'Makes an HTTP POST request with error handling';

-- Update email notification function to use proper error handling
CREATE OR REPLACE FUNCTION handle_email_notification()
RETURNS trigger AS $$
BEGIN
  -- Call Edge function to send email with error handling
  BEGIN
    PERFORM
      net.http_post(
        url := CASE WHEN current_setting('request.scheme', true) = 'https'
          THEN 'https://' || current_setting('request.host', true) || '/functions/v1/send-email'
          ELSE 'http://localhost:54321/functions/v1/send-email'
        END,
        body := json_build_object('email_log_id', NEW.id)::text,
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.jwt.claim.sub', true) || '"}'::jsonb
      );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the trigger
    RAISE WARNING 'Failed to send email notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;