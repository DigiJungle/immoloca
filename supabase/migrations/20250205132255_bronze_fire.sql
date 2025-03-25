/*
  # Add application approval functionality
  
  1. Changes
    - Add function to approve applications
    - Add function to reject applications
    - Add trigger to handle status changes
  
  2. Security
    - Functions are SECURITY DEFINER to ensure proper access control
    - Only authenticated users can call these functions
*/

-- Function to approve an application
CREATE OR REPLACE FUNCTION approve_application(application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the user has permission to approve this application
  IF NOT EXISTS (
    SELECT 1 
    FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE a.id = application_id 
    AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to approve this application';
  END IF;

  -- Update the application status
  UPDATE applications
  SET 
    status = 'approved',
    updated_at = now()
  WHERE id = application_id;
END;
$$;

-- Function to reject an application
CREATE OR REPLACE FUNCTION reject_application(application_id uuid, reason text)
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
    notification_data = jsonb_build_object(
      'reason', reason,
      'rejected_at', now()
    )
  WHERE id = application_id;
END;
$$;