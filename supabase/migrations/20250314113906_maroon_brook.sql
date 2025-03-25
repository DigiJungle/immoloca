/*
  # Add test notifications

  1. Changes
    - Add test notifications for existing applications
    - Ensure notifications are linked to the correct user
    - Set notifications as unread
*/

-- First, get the admin user ID
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'bn.leroux@gmail.com';

  -- Insert notifications for existing applications
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
    admin_id,
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
    WHERE n.user_id = admin_id 
    AND n.type = 'new_application'
    AND n.created_at = a.created_at
  );
END $$;