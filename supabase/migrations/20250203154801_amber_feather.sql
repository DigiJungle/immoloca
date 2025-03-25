-- Add notification fields to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_type text,
ADD COLUMN IF NOT EXISTS notification_data jsonb;

-- Create index for notification fields
CREATE INDEX IF NOT EXISTS idx_applications_notification ON applications (notification_sent, notification_type);

-- Create function to handle notification triggers
CREATE OR REPLACE FUNCTION handle_application_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process rows that need notification
  IF NEW.notification_sent = true AND OLD.notification_sent = false THEN
    -- Log notification request (for debugging)
    INSERT INTO notification_logs (
      application_id,
      notification_type,
      notification_data,
      created_at
    ) VALUES (
      NEW.id,
      NEW.notification_type,
      NEW.notification_data,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id),
  notification_type text,
  notification_data jsonb,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  error text
);

-- Create trigger for notifications
DROP TRIGGER IF EXISTS application_notification_trigger ON applications;
CREATE TRIGGER application_notification_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_notification();