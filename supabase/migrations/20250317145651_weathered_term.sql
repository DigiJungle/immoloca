/*
  # Add email trigger system

  1. Changes
    - Add trigger to call Edge function when new email log is created
    - Add function to handle email notifications
*/

-- Create notification function
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
      body := json_build_object('email_log_id', NEW.id)::text,
      headers := '{"Content-Type": "application/json"}'
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new email logs
DROP TRIGGER IF EXISTS on_email_log_created ON email_logs;
CREATE TRIGGER on_email_log_created
  AFTER INSERT ON email_logs
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION handle_email_notification();

-- Add comment
COMMENT ON FUNCTION handle_email_notification() IS 'Triggers Edge function to send email when new log is created';