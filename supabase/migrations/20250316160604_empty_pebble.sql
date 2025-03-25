/*
  # Simplify notifications structure

  1. Changes
    - Remove email and phone fields
    - Update trigger to focus on essential info
*/

-- Remove unnecessary columns
ALTER TABLE notifications 
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone;

-- Update trigger function to focus on essential info
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