/*
  # Fix group visits column names

  1. Changes
    - Rename visit_date to date for consistency
    - Rename visit_duration to duration
    - Update references in functions and triggers
*/

-- Rename columns in group_visits table
ALTER TABLE group_visits 
RENAME COLUMN visit_date TO date;

ALTER TABLE group_visits 
RENAME COLUMN visit_duration TO duration;

-- Drop and recreate function to use new column names
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
  WHERE visit_id = group_visit_id;

  -- Get property details
  SELECT * INTO property_record
  FROM properties
  WHERE id = visit_record.property_id;

  -- Send email to each selected candidate
  FOR application_record IN
    SELECT a.*
    FROM applications a
    JOIN group_visit_applications gva ON gva.application_id = a.id
    WHERE gva.visit_id = group_visit_id
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

-- Drop and recreate indexes with new column names
DROP INDEX IF EXISTS idx_group_visits_date;
CREATE INDEX idx_group_visits_date ON group_visits(date);

-- Add comments
COMMENT ON COLUMN group_visits.date IS 'Date and time of the group visit';
COMMENT ON COLUMN group_visits.duration IS 'Duration of the visit in minutes';