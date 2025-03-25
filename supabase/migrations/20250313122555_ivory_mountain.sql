-- Drop existing objects first
DROP TABLE IF EXISTS applications CASCADE;
DROP TYPE IF EXISTS application_status CASCADE;
DROP FUNCTION IF EXISTS validate_document_status() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create application status enum
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create applications table
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text,
  status application_status NOT NULL DEFAULT 'pending',
  score integer CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
  document_status jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

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

-- Create indexes
CREATE INDEX idx_applications_property_id ON applications(property_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_applications_document_status ON applications USING gin(document_status jsonb_path_ops);
CREATE INDEX idx_applications_user_id ON applications(user_id);

-- Create function to validate document status
CREATE OR REPLACE FUNCTION validate_document_status()
RETURNS trigger AS $$
BEGIN
  -- Ensure document_status is a valid JSONB object
  IF NEW.document_status IS NULL THEN
    NEW.document_status := '{}'::jsonb;
  END IF;
  
  -- Validate structure
  IF jsonb_typeof(NEW.document_status) != 'object' THEN
    RAISE EXCEPTION 'document_status must be a JSON object';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER check_document_status
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_status();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE applications IS 'Stores rental/purchase applications with document validation status';
COMMENT ON COLUMN applications.document_status IS 'Stores document validation status and extracted information';