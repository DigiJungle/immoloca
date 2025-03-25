/*
  # Fix applications table policies

  1. Changes
    - Drop existing policies
    - Recreate policies with proper checks
    - Add missing indexes
  
  2. Security
    - Ensure proper RLS setup
    - Allow public application creation
    - Restrict access to property owners
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Public can create applications" ON applications;
DROP POLICY IF EXISTS "Property owners can read applications" ON applications;
DROP POLICY IF EXISTS "Property owners can update applications" ON applications;

-- Create policies
CREATE POLICY "Public can create applications"
  ON applications
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Property owners can read applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = applications.property_id
      AND properties.user_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = applications.property_id
      AND properties.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = applications.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Create or replace indexes
DROP INDEX IF EXISTS idx_applications_property_id;
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_created_at;
DROP INDEX IF EXISTS idx_applications_document_status;

CREATE INDEX IF NOT EXISTS idx_applications_property_id ON applications(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_document_status ON applications USING gin(document_status jsonb_path_ops);