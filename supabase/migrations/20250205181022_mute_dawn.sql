/*
  # Add RLS to notification_logs table

  1. Security Changes
    - Enable RLS on notification_logs table
    - Add policies for authenticated users to manage logs
    - Add policy for public to read logs

  2. Changes
    - Enable RLS on notification_logs table
    - Add appropriate policies for access control
*/

-- Enable RLS on notification_logs table
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage logs
CREATE POLICY "Allow authenticated users to manage notification logs"
ON notification_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE a.id = notification_logs.application_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications a
    JOIN properties p ON a.property_id = p.id
    WHERE a.id = notification_logs.application_id
    AND p.user_id = auth.uid()
  )
);

-- Create policy for public to read logs
CREATE POLICY "Allow public to read notification logs"
ON notification_logs
FOR SELECT
TO public
USING (true);