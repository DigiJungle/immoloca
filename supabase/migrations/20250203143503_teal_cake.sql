/*
  # Configure storage policies for applications

  1. Storage Configuration
    - Update bucket settings for applications
    - Set proper file size limits and MIME types
  
  2. Security
    - Update policies for file access control
    - Add size restrictions based on file type
*/

-- Update the applications bucket configuration if it exists
UPDATE storage.buckets
SET 
  public = FALSE,
  file_size_limit = 5242880, -- 5MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
WHERE id = 'applications';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Allow public to upload application files" ON storage.objects;
DROP POLICY IF EXISTS "Allow property owners to read application files" ON storage.objects;

-- Create updated policies
CREATE POLICY "Allow public to upload application files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'applications'
);

CREATE POLICY "Allow property owners to read application files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applications' AND
  EXISTS (
    SELECT 1 FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE p.user_id = auth.uid()
    AND storage.objects.name LIKE a.property_id || '/%'
  )
);