/*
  # Add storage bucket for applications

  1. New Storage
    - Create 'applications' bucket for storing application documents
    - Set up storage policies for public uploads and authenticated access
*/

-- Enable storage by creating the applications bucket
INSERT INTO storage.buckets (id, name)
VALUES ('applications', 'applications')
ON CONFLICT DO NOTHING;

-- Allow public to upload files (needed for application submission)
CREATE POLICY "Allow public to upload application files"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'applications'
);

-- Allow authenticated users to read files from their properties' applications
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