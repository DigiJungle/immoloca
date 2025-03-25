/*
  # Add http extension for email notifications

  1. Changes
    - Enable http extension for making HTTP requests
    - Create net schema and functions
*/

-- Enable http extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create net schema
CREATE SCHEMA IF NOT EXISTS net;

-- Create http_post function in net schema
CREATE OR REPLACE FUNCTION net.http_post(
  url text,
  body text DEFAULT NULL,
  params jsonb DEFAULT NULL,
  headers jsonb DEFAULT NULL
)
RETURNS http_response
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN http_post(
    url,
    body,
    params,
    headers
  );
END;
$$;