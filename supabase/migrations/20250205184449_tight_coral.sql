-- Create properties bucket for storing property images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'properties',
  'properties',
  TRUE,
  5242880, -- 5MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
) ON CONFLICT DO NOTHING;

-- Create policies for the properties bucket
CREATE POLICY "Allow public to read property images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'properties');

CREATE POLICY "Allow authenticated users to upload property images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'properties');

CREATE POLICY "Allow property owners to manage their images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'properties')
WITH CHECK (bucket_id = 'properties');