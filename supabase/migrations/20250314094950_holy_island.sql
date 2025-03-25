-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_new_application ON applications;

-- Drop function if it exists
DROP FUNCTION IF EXISTS handle_new_application();

-- Add read column to notifications if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;

-- Add user_id column to notifications if it doesn't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create or replace function to handle new applications
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
CREATE TRIGGER on_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_application();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

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