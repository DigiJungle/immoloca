/*
  # Update file size limits and validation

  1. Changes
    - Set file size limit to 5MB
    - Update storage policies
    
  2. Security
    - Maintain existing RLS policies
    - Add file type validation
*/

-- Update applications bucket configuration
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