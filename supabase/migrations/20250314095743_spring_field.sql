/*
  # Add notifications system

  1. New Tables
    - notifications: Stores notifications for users
      - id (uuid)
      - user_id (uuid, references auth.users)
      - type (text)
      - subject (text)
      - content_html (text)
      - content_text (text)
      - read (boolean)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for user access
    - Add trigger for new applications
*/

-- Drop existing notifications table if it exists
DROP TABLE IF EXISTS notifications CASCADE;

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
CREATE POLICY "Users can read their own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
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
    content_text
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
    )
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new applications
DROP TRIGGER IF EXISTS on_new_application ON applications;

CREATE TRIGGER on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_application();