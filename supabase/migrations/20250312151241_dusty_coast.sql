/*
  # Create document analysis logs table
  
  1. Changes
    - Create document_analysis_logs table if not exists
    - Drop existing policies to avoid conflicts
    - Create new policies for access control
    - Add index for performance
  
  2. Security
    - Enable RLS
    - Add policies for authenticated and public access
*/

-- Create table for document analysis logs
CREATE TABLE IF NOT EXISTS document_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date timestamptz NOT NULL,
  analysis_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated to read logs" ON document_analysis_logs;
DROP POLICY IF EXISTS "Allow public to insert logs" ON document_analysis_logs;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated to read logs"
  ON document_analysis_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for public to insert logs
CREATE POLICY "Allow public to insert logs"
  ON document_analysis_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create index for analysis_date
CREATE INDEX IF NOT EXISTS idx_analysis_logs_date ON document_analysis_logs(analysis_date);