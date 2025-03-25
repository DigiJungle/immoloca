/*
  # Fix group visit applications column references

  1. Changes
    - Drop and recreate group_visit_applications table with proper column names
    - Update foreign key references
    - Add proper indexes and constraints
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing table
DROP TABLE IF EXISTS group_visit_applications CASCADE;

-- Create group_visit_applications table with proper structure
CREATE TABLE group_visit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES group_visits(visit_id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(visit_id, application_id)
);

-- Enable RLS
ALTER TABLE group_visit_applications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_group_visit_apps_visit ON group_visit_applications(visit_id);
CREATE INDEX idx_group_visit_apps_application ON group_visit_applications(application_id);
CREATE INDEX idx_group_visit_apps_status ON group_visit_applications(status);

-- Create policy for property owners
CREATE POLICY "Property owners can manage visit applications"
  ON group_visit_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM group_visits v
      JOIN properties p ON p.id = v.property_id
      WHERE v.visit_id = group_visit_applications.visit_id
      AND p.user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE group_visit_applications IS 'Links applications to group visits';