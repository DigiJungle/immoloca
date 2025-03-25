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
DROP POLICY IF EXISTS "Users can read their own logs" ON document_analysis_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON document_analysis_logs;

-- Create policy for authenticated users
CREATE POLICY "Users can read their own logs"
  ON document_analysis_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy for public to insert logs
CREATE POLICY "Users can insert their own logs"
  ON document_analysis_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for analysis_date
CREATE INDEX IF NOT EXISTS idx_analysis_logs_date ON document_analysis_logs(analysis_date);