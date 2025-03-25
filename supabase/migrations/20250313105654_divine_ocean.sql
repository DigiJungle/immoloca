/*
  # Fix document status handling

  1. Changes
    - Drop and recreate document_status column with proper type
    - Add proper index for JSON operations
    - Update RLS policies
*/

-- Drop existing document_status column if it exists
ALTER TABLE applications DROP COLUMN IF EXISTS document_status;

-- Add document_status column with proper type and default
ALTER TABLE applications ADD COLUMN document_status jsonb DEFAULT '{}'::jsonb;

-- Create GIN index for efficient JSON operations
CREATE INDEX IF NOT EXISTS idx_applications_document_status ON applications USING gin(document_status jsonb_path_ops);

-- Drop existing policies
DROP POLICY IF EXISTS "Public can create applications" ON applications;

-- Create new policy for public application submission
CREATE POLICY "Public can create applications"
ON applications
FOR INSERT
TO public
WITH CHECK (true);

-- Add comment
COMMENT ON COLUMN applications.document_status IS 'Stores document validation status and extracted information';

-- Add function to validate document status
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

-- Create trigger to validate document status
DROP TRIGGER IF EXISTS check_document_status ON applications;
CREATE TRIGGER check_document_status
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_status();