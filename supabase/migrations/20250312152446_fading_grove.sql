-- Update applications bucket configuration
UPDATE storage.buckets
SET 
  public = TRUE,
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
WHERE id = 'applications';

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public to upload application files" ON storage.objects;

-- Create new policy with simplified file size check
CREATE POLICY "Allow public to upload application files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'applications' AND
  octet_length(name) <= 10485760
);