/*
  # Update notifications structure

  1. Changes
    - Add email and phone fields to notifications
    - Update trigger to include contact info
*/

-- Add columns for contact info
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS phone text;

-- Update existing notifications with contact info
UPDATE notifications n
SET 
  email = a.email,
  phone = a.phone
FROM applications a
WHERE n.application_id = a.id;

-- Update trigger function to include contact info
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
    email,
    phone
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
    NEW.email,
    NEW.phone
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;