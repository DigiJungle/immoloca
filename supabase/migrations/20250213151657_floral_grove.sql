-- Create logos bucket for storing agency logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  TRUE,
  2097152, -- 2MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
) ON CONFLICT DO NOTHING;

-- Create policies for the logos bucket
CREATE POLICY "Allow public to read logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow users to manage their own logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

-- Add logo_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url text;