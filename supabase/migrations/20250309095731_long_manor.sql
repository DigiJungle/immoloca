/*
  # Add Document Analysis Logs Table

  1. New Tables
    - `document_analysis_logs`
      - `id` (uuid, primary key)
      - `analysis_date` (timestamptz)
      - `analysis_data` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for public access
*/

-- Create document analysis logs table
CREATE TABLE IF NOT EXISTS document_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date timestamptz NOT NULL,
  analysis_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for public to insert logs
CREATE POLICY "Allow public to insert logs"
  ON document_analysis_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create policy for authenticated users to read logs
CREATE POLICY "Allow authenticated to read logs"
  ON document_analysis_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for analysis_date
CREATE INDEX idx_analysis_logs_date ON document_analysis_logs(analysis_date);

-- Add comment
COMMENT ON TABLE document_analysis_logs IS 'Stores logs of document analysis operations';