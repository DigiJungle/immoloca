/*
  # Fix group visit column ambiguity

  1. Changes
    - Drop existing policies
    - Recreate policies with explicit table aliases
    - Add proper indexes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Property owners can manage group visit applications" ON group_visit_applications;
DROP POLICY IF EXISTS "Property owners can manage group visits" ON group_visits;

-- Create policy for group visits with explicit table references
CREATE POLICY "Property owners can manage group visits"
  ON group_visits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = group_visits.property_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = group_visits.property_id
      AND p.user_id = auth.uid()
    )
  );

-- Create policy for group visit applications with explicit table references
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

-- Create indexes for better join performance
CREATE INDEX IF NOT EXISTS idx_group_visits_property_id ON group_visits(property_id);
CREATE INDEX IF NOT EXISTS idx_group_visit_applications_group_visit_id ON group_visit_applications(group_visit_id);
CREATE INDEX IF NOT EXISTS idx_group_visit_applications_application_id ON group_visit_applications(application_id);

-- Add comments
COMMENT ON POLICY "Property owners can manage group visits" ON group_visits IS 'Allow property owners to manage group visits for their properties';
COMMENT ON POLICY "Property owners can manage group visit applications" ON group_visit_applications IS 'Allow property owners to manage applications for group visits of their properties';