/*
  # Fix group visit application policies

  1. Changes
    - Drop and recreate policies with proper table aliases
    - Fix ambiguous column references
    - Add proper indexes for performance
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Property owners can manage group visit applications" ON group_visit_applications;

-- Create new policy with proper table aliases
CREATE POLICY "Property owners can manage group visit applications"
  ON group_visit_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM group_visits gv
      JOIN properties p ON p.id = gv.property_id
      WHERE gv.id = group_visit_applications.group_visit_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM group_visits gv
      JOIN properties p ON p.id = gv.property_id
      WHERE gv.id = group_visit_applications.group_visit_id
      AND p.user_id = auth.uid()
    )
  );

-- Create indexes for better join performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_group_visit_applications_visit 
ON group_visit_applications(group_visit_id);

CREATE INDEX IF NOT EXISTS idx_group_visit_applications_application 
ON group_visit_applications(application_id);

CREATE INDEX IF NOT EXISTS idx_group_visit_applications_status 
ON group_visit_applications(status);