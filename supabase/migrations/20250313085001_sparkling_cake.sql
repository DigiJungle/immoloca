/*
  # Fix applications user_id column

  1. Changes
    - Make user_id column nullable in applications table
    - Update RLS policies to handle null user_id
*/

-- Make user_id column nullable if it's not already
DO $$ 
BEGIN
  -- Check if the column is already nullable
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'applications' 
    AND column_name = 'user_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- Make the column nullable
    ALTER TABLE applications ALTER COLUMN user_id DROP NOT NULL;
  END IF;
END $$;

-- Drop existing foreign key constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_user_id_fkey'
  ) THEN
    ALTER TABLE applications DROP CONSTRAINT applications_user_id_fkey;
  END IF;
END $$;

-- Add foreign key constraint with ON DELETE SET NULL
ALTER TABLE applications
ADD CONSTRAINT applications_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE SET NULL;

-- Update RLS policies to handle null user_id
DROP POLICY IF EXISTS "Public can create applications" ON applications;
CREATE POLICY "Public can create applications"
ON applications
FOR INSERT
TO public
WITH CHECK (true);

-- Recreate index for user_id
DROP INDEX IF EXISTS idx_applications_user_id;
CREATE INDEX idx_applications_user_id ON applications(user_id);