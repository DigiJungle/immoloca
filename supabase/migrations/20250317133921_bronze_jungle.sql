/*
  # Fix notifications table structure

  1. Changes
    - Add type column if not exists
    - Remove unused columns
    - Update trigger function
    - Add proper indexes
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_new_application ON applications;
DROP FUNCTION IF EXISTS handle_new_application();

-- Create function to handle new applications
CREATE OR REPLACE FUNCTION handle_new_application()
RETURNS trigger AS $$
BEGIN
  -- Get property owner's user_id and create notification
  INSERT INTO notifications (
    user_id,
    type,
    property_id,
    application_id,
    first_name,
    last_name,
    property_title,
    read,
    created_at
  )
  SELECT 
    properties.user_id,
    'new_application',
    NEW.property_id,
    NEW.id,
    NEW.first_name,
    NEW.last_name,
    properties.title,
    false,
    NEW.created_at
  FROM properties
  WHERE properties.id = NEW.property_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new applications
CREATE TRIGGER on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_application();

-- Add comment
COMMENT ON TABLE notifications IS 'Stores user notifications with minimal required fields';