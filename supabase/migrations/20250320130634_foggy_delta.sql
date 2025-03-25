/*
  # Add group visit notification function

  1. Changes
    - Add function to handle group visit notifications
    - Add trigger to send notifications when group visit is created
*/

-- Create function to handle group visit notifications
CREATE OR REPLACE FUNCTION handle_new_group_visit()
RETURNS trigger AS $$
DECLARE
  property_record RECORD;
  application_record RECORD;
BEGIN
  -- Get property details
  SELECT * INTO property_record
  FROM properties
  WHERE id = NEW.property_id;

  -- For each application in the group visit
  FOR application_record IN
    SELECT a.*
    FROM applications a
    JOIN group_visit_applications gva ON gva.application_id = a.id
    WHERE gva.group_visit_id = NEW.id
  LOOP
    -- Create email log
    INSERT INTO email_logs (
      recipient,
      template_type,
      variables,
      status
    ) VALUES (
      application_record.email,
      'group_visit_invitation',
      jsonb_build_object(
        'property_title', property_record.title,
        'visit_date', to_char(NEW.date, 'DD/MM/YYYY à HH24:MI'),
        'visit_duration', NEW.duration,
        'property_address', property_record.location,
        'first_name', application_record.first_name,
        'last_name', application_record.last_name
      ),
      'pending'
    );

    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      property_id,
      application_id,
      first_name,
      last_name,
      property_title,
      read
    ) VALUES (
      application_record.user_id,
      'group_visit_scheduled',
      NEW.property_id,
      application_record.id,
      application_record.first_name,
      application_record.last_name,
      property_record.title,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_group_visit_created ON group_visits;
CREATE TRIGGER on_group_visit_created
  AFTER INSERT ON group_visits
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_group_visit();

-- Add comment
COMMENT ON FUNCTION handle_new_group_visit IS 'Sends notifications and emails when a new group visit is created';