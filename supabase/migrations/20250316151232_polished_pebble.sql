/*
  # Fix notifications data structure

  1. Changes
    - Add first_name and last_name columns to notifications
    - Update existing notifications with application data
    - Update trigger to include candidate info
*/

-- Add columns for candidate info
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update existing notifications with candidate info
UPDATE notifications n
SET 
  first_name = a.first_name,
  last_name = a.last_name
FROM applications a
WHERE n.application_id = a.id;

-- Update trigger function to include candidate info
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
    application_id,
    first_name,
    last_name
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
    NEW.id,
    NEW.first_name,
    NEW.last_name
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;