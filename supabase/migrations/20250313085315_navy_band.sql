/*
  # Fix applications schema and document handling

  1. Changes
    - Add document_status column if not exists
    - Make user_id nullable
    - Update RLS policies
    - Add proper indexes
*/

-- Add document_status column if it doesn't exist
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS document_status jsonb DEFAULT '{}'::jsonb;

-- Make user_id column nullable if it's not already
ALTER TABLE applications 
ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing foreign key constraint if it exists
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS applications_user_id_fkey;

-- Add foreign key constraint with ON DELETE SET NULL
ALTER TABLE applications
ADD CONSTRAINT applications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Drop existing policies
DROP POLICY IF EXISTS "Public can create applications" ON applications;

-- Create new policies
CREATE POLICY "Public can create applications"
ON applications
FOR INSERT
TO public
WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_applications_document_status ON applications USING gin(document_status);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);