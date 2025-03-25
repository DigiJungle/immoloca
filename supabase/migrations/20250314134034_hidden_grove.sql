/*
  # Fix notifications system

  1. Changes
    - Drop and recreate notifications table with proper structure
    - Update trigger function for new applications
    - Add proper indexes and RLS policies
*/

-- Drop existing notifications table and related objects
DROP TABLE IF EXISTS notifications CASCADE;
DROP FUNCTION IF EXISTS handle_new_application() CASCADE;

-- Create notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  subject text NOT NULL,
  content_html text NOT NULL,
  content_text text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Create policies
CREATE POLICY "Users can read notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to handle new applications
CREATE OR REPLACE FUNCTION handle_new_application()
RETURNS trigger AS $$
BEGIN
  -- Get property owner's user_id and create notification
  INSERT INTO notifications (
    user_id,
    type,
    subject,
    content_html,
    content_text,
    read,
    created_at
  )
  SELECT 
    properties.user_id,
    'new_application',
    'Nouvelle candidature',
    format(
      '<div><p>Nouvelle candidature reçue pour le bien <strong>%s</strong></p><p>Candidat : %s %s</p></div>',
      properties.title,
      NEW.first_name,
      NEW.last_name
    ),
    format(
      'Nouvelle candidature reçue pour le bien %s\nCandidat : %s %s',
      properties.title,
      NEW.first_name,
      NEW.last_name
    ),
    false,
    NEW.created_at
  FROM properties
  WHERE properties.id = NEW.property_id;

  -- Log the notification creation
  INSERT INTO notification_logs (
    application_id,
    notification_type,
    notification_data,
    created_at
  ) VALUES (
    NEW.id,
    'new_application',
    jsonb_build_object(
      'property_id', NEW.property_id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'created_at', NEW.created_at
    ),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS on_new_application ON applications;
CREATE TRIGGER on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_application();

-- Insert test notifications
INSERT INTO notifications (
  user_id,
  type,
  subject,
  content_html,
  content_text,
  read,
  created_at
)
SELECT 
  p.user_id,
  'new_application',
  'Nouvelle candidature',
  format(
    '<div><p>Nouvelle candidature reçue pour le bien <strong>%s</strong></p><p>Candidat : %s %s</p></div>',
    p.title,
    a.first_name,
    a.last_name
  ),
  format(
    'Nouvelle candidature reçue pour le bien %s\nCandidat : %s %s',
    p.title,
    a.first_name,
    a.last_name
  ),
  false,
  a.created_at
FROM applications a
JOIN properties p ON a.property_id = p.id
WHERE a.status = 'pending'
AND NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.user_id = p.user_id
  AND n.type = 'new_application'
  AND n.created_at = a.created_at
);