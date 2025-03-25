/*
  # Add group visit email notifications

  1. Changes
    - Add email template for group visit invitations
    - Add function to send emails to selected candidates
    - Add trigger for automatic email sending
    - Add notification type for group visits
*/

-- Add email template for group visit invitations
INSERT INTO email_logs (
  recipient,
  template_type,
  variables,
  status
) VALUES (
  'test@example.com',
  'group_visit_invitation',
  jsonb_build_object(
    'property_title', 'Test Property',
    'visit_date', '2024-03-20T14:00:00Z',
    'visit_duration', '20',
    'property_address', '123 Test Street'
  ),
  'pending'
);

-- Function to send group visit emails
CREATE OR REPLACE FUNCTION send_group_visit_emails(
  group_visit_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visit_record RECORD;
  application_record RECORD;
  property_record RECORD;
BEGIN
  -- Get group visit details
  SELECT * INTO visit_record
  FROM group_visits
  WHERE id = group_visit_id;

  -- Get property details
  SELECT * INTO property_record
  FROM properties
  WHERE id = visit_record.property_id;

  -- Send email to each selected candidate
  FOR application_record IN
    SELECT a.*
    FROM applications a
    JOIN group_visit_applications gva ON gva.application_id = a.id
    WHERE gva.group_visit_id = group_visit_id
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
        'visit_date', visit_record.date,
        'visit_duration', visit_record.duration,
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
    )
    SELECT
      a.user_id,
      'group_visit_scheduled',
      visit_record.property_id,
      application_record.id,
      application_record.first_name,
      application_record.last_name,
      property_record.title,
      false
    FROM applications a
    WHERE a.id = application_record.id;
  END LOOP;
END;
$$;

-- Trigger to automatically send emails when group visit is created
CREATE OR REPLACE FUNCTION handle_new_group_visit()
RETURNS trigger AS $$
BEGIN
  -- Send emails to all selected candidates
  PERFORM send_group_visit_emails(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_group_visit_created
  AFTER INSERT ON group_visits
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_group_visit();

-- Add comment
COMMENT ON FUNCTION send_group_visit_emails IS 'Sends email invitations to candidates for a group visit';