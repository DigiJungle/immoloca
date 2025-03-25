/*
  # Remove rejection reason requirement

  1. Changes
    - Update reject_application function to not require reason
    - Remove reason column from applications table
*/

-- Drop existing function
DROP FUNCTION IF EXISTS reject_application(uuid, text);

-- Create new function without reason parameter
CREATE OR REPLACE FUNCTION reject_application(
  application_id uuid
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
    updated_at = now()
  WHERE id = application_id;
END;
$$;

-- Remove reason column
ALTER TABLE applications DROP COLUMN IF EXISTS reason;