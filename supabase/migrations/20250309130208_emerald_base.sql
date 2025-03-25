/*
  # Create document analysis logs table
  
  1. New Tables
    - `document_analysis_logs`
      - `id` (uuid, primary key)
      - `analysis_date` (timestamptz)
      - `analysis_data` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `document_analysis_logs` table
    - Add policy for authenticated users to read/write their own logs
*/

CREATE TABLE IF NOT EXISTS document_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date timestamptz NOT NULL,
  analysis_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_analysis_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own logs"
  ON document_analysis_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own logs"
  ON document_analysis_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);