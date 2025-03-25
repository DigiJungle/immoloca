/*
  # Add property title to notifications

  1. Changes
    - Add property_title column
    - Update trigger to include property title
*/

-- Add property_title column
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS property_title text;

-- Update existing notifications with property titles
UPDATE notifications n
SET property_title = p.title
FROM properties p
WHERE n.property_id = p.id;

-- Update trigger function to include property title
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
    last_name,
    property_title
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
    NEW.last_name,
    properties.title
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;