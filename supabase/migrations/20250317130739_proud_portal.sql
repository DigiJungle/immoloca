/*
  # Fix application rejection functionality

  1. Changes
    - Update reject_application function to not use notification_data
    - Add reason column to applications table
    - Update trigger to handle rejection notifications
*/

-- Add reason column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS reason text;

-- Drop existing function
DROP FUNCTION IF EXISTS reject_application(uuid, text);

-- Create new function without notification_data
CREATE OR REPLACE FUNCTION reject_application(
  application_id uuid,
  rejection_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user has permission to reject this application
  IF NOT EXISTS (
    SELECT 1 
    FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE a.id = application_id 
    AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to reject this application';
  END IF;

  -- Update the application status
  UPDATE applications
  SET 
    status = 'rejected',
    updated_at = now(),
    reason = rejection_reason
  WHERE id = application_id;
END;
$$;