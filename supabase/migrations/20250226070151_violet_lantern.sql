-- Create table for document analysis logs
CREATE TABLE document_analysis_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date timestamptz NOT NULL,
  analysis_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated to read logs"
  ON document_analysis_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Create index for analysis_date
CREATE INDEX idx_analysis_logs_date ON document_analysis_logs(analysis_date);