/*
  # Update storage policies for applications

  1. Storage Configuration
    - Set bucket as public to allow uploads
    - Configure file size limits and MIME types
  
  2. Security
    - Update policies to allow public uploads
    - Maintain secure read access for property owners
*/

-- Update the applications bucket configuration
UPDATE storage.buckets
SET 
  public = TRUE,
  file_size_limit = 5242880, -- 5MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
WHERE id = 'applications';

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public to upload application files" ON storage.objects;
DROP POLICY IF EXISTS "Allow property owners to read application files" ON storage.objects;

-- Create new policies with proper permissions
CREATE POLICY "Allow public to upload application files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'applications');

CREATE POLICY "Allow public to read application files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'applications');

CREATE POLICY "Allow authenticated users to manage application files"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'applications')
WITH CHECK (bucket_id = 'applications');