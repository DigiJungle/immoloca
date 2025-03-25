/*
  # Fix email logs policy

  1. Changes
    - Drop existing policy if it exists
    - Create policy only if it doesn't exist
    - Keep email logs table structure
*/

-- Drop email templates table
DROP TABLE IF EXISTS email_templates CASCADE;

-- Keep only email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient text NOT NULL,
  template_type text NOT NULL,
  variables jsonb NOT NULL,
  status text NOT NULL,
  error text,
  attempts integer DEFAULT 0,
  last_attempt timestamptz,
  created_at timestamptz DEFAULT now(),
  sent_at timestamptz
);

-- Enable RLS
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow authenticated to read logs" ON email_logs;

-- Create policy
CREATE POLICY "Allow authenticated to read logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Update send_application_email function
CREATE OR REPLACE FUNCTION send_application_email(
  application_id uuid,
  template_type text,
  variables jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_record RECORD;
BEGIN
  -- Get application data
  SELECT * INTO app_record
  FROM applications
  WHERE id = application_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Log email attempt
  INSERT INTO email_logs (
    recipient,
    template_type,
    variables,
    status
  ) VALUES (
    app_record.email,
    template_type,
    variables,
    'pending'
  );
END;
$$;