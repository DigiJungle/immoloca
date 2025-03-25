/*
  # Update notifications table

  1. Changes
    - Add property_id and application_id columns
    - Update trigger function
    - Update existing notifications
*/

-- Add new columns
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id) ON DELETE CASCADE;

-- Update trigger function
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
    created_at,
    property_id,
    application_id
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
    NEW.created_at,
    NEW.property_id,
    NEW.id
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;