/*
  # Add notification trigger for new applications

  1. Changes
    - Add trigger function to create notifications for new applications
    - Add trigger to applications table
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access
*/

-- Function to create notification on new application
CREATE OR REPLACE FUNCTION handle_new_application()
RETURNS trigger AS $$
BEGIN
  -- Get property owner's user_id and create notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    read
  )
  SELECT 
    properties.user_id,
    'new_application',
    'Nouvelle candidature',
    format('Nouvelle candidature de %s %s pour %s', 
      NEW.first_name, 
      NEW.last_name, 
      properties.title
    ),
    false
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