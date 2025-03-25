-- Drop existing tables and functions
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP FUNCTION IF EXISTS send_group_visit_emails CASCADE;

-- Create email_logs table
CREATE TABLE email_logs (
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
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at);

-- Create policy for reading logs
CREATE POLICY "Allow public to read logs"
  ON email_logs
  FOR SELECT
  TO public
  USING (true);

-- Create function to handle email notifications
CREATE OR REPLACE FUNCTION handle_email_notification()
RETURNS trigger AS $$
BEGIN
  -- Call Edge function to send email
  PERFORM
    net.http_post(
      url := CASE WHEN current_setting('request.scheme', true) = 'https'
        THEN 'https://' || current_setting('request.host', true) || '/functions/v1/send-email'
        ELSE 'http://localhost:54321/functions/v1/send-email'
      END,
      body := json_build_object(
        'email_log_id', NEW.id,
        'recipient', NEW.recipient,
        'template_type', NEW.template_type,
        'variables', NEW.variables
      )::text,
      headers := '{"Content-Type": "application/json"}'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email notifications
CREATE TRIGGER on_email_log_created
  AFTER INSERT ON email_logs
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION handle_email_notification();

-- Add comment
COMMENT ON FUNCTION handle_email_notification() IS 'Triggers Edge function to send email when new log is created';