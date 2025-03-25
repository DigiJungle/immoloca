/*
  # Fix application submission

  1. Changes
    - Add document_status column with proper type
    - Update RLS policies for public application submission
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Ensure public can submit applications
*/

-- Drop existing document_status column if it exists
ALTER TABLE applications DROP COLUMN IF EXISTS document_status;

-- Add document_status column with proper type
ALTER TABLE applications ADD COLUMN document_status jsonb DEFAULT '{}'::jsonb;

-- Create index for document_status
CREATE INDEX IF NOT EXISTS idx_applications_document_status ON applications USING gin(document_status);

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