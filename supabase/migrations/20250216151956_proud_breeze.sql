/*
  # Document Validation System

  1. New Tables
    - `document_types`: Types de documents acceptés
    - `document_validations`: Règles de validation par type de document
    - `application_documents`: Documents soumis par les candidats
    - `document_analysis_results`: Résultats d'analyse des documents

  2. Security
    - Enable RLS on all tables
    - Add policies for document access and validation
    - Secure document analysis results
*/

-- Create enum for document status
CREATE TYPE document_status AS ENUM (
  'pending',
  'analyzing',
  'valid',
  'invalid',
  'requires_review'
);

-- Create enum for document category
CREATE TYPE document_category AS ENUM (
  'identity',
  'professional',
  'financial',
  'residence',
  'guarantor'
);

-- Document types table
CREATE TABLE document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category document_category NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  required boolean DEFAULT true,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Document validation rules
CREATE TABLE document_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id uuid REFERENCES document_types(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  rule_description text NOT NULL,
  validation_function text NOT NULL,
  error_message text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Application documents
CREATE TABLE application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  document_type_id uuid REFERENCES document_types(id),
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size integer NOT NULL,
  status document_status DEFAULT 'pending',
  uploaded_at timestamptz DEFAULT now(),
  analyzed_at timestamptz,
  validation_results jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Document analysis results
CREATE TABLE document_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES application_documents(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  confidence_score float NOT NULL,
  extracted_data jsonb NOT NULL,
  issues jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Insert default document types
INSERT INTO document_types (category, name, description, required, order_index) VALUES
('identity', 'Pièce d''identité', 'Carte d''identité, passeport ou titre de séjour valide', true, 1),
('professional', 'Contrat de travail', 'Contrat de travail ou attestation employeur', true, 2),
('financial', 'Bulletins de salaire', '3 derniers bulletins de salaire', true, 3),
('financial', 'Avis d''imposition', 'Dernier avis d''imposition', true, 4),
('residence', 'Justificatif de domicile', 'Facture d''électricité, eau ou quittance de loyer', true, 5),
('guarantor', 'Pièce d''identité garant', 'Pièce d''identité du garant', false, 6),
('guarantor', 'Justificatif revenus garant', 'Justificatifs de revenus du garant', false, 7);

-- Insert default validation rules
INSERT INTO document_validations (document_type_id, rule_name, rule_description, validation_function, error_message, severity) 
SELECT 
  dt.id,
  'date_validite',
  'Vérifie la validité du document',
  'check_document_validity',
  'Document expiré ou invalide',
  'error'
FROM document_types dt
WHERE dt.category = 'identity';

-- Enable RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_analysis_results ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public to read document types"
  ON document_types FOR SELECT TO public
  USING (true);

CREATE POLICY "Allow authenticated to read validation rules"
  ON document_validations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow users to manage their own documents"
  ON application_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = application_documents.application_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Allow property owners to view application documents"
  ON application_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN properties p ON a.property_id = p.id
      WHERE a.id = application_documents.application_id
      AND p.user_id = auth.uid()
    )
  );

-- Create function to process document analysis
CREATE OR REPLACE FUNCTION process_document_analysis(
  document_id uuid,
  analysis_data jsonb
) RETURNS void AS $$
DECLARE
  doc_record RECORD;
  validation_record RECORD;
  is_valid boolean := true;
  issues jsonb := '[]'::jsonb;
BEGIN
  -- Get document information
  SELECT * INTO doc_record
  FROM application_documents
  WHERE id = document_id;

  -- Get validation rules
  FOR validation_record IN
    SELECT * FROM document_validations
    WHERE document_type_id = doc_record.document_type_id
  LOOP
    -- Apply validation rules
    EXECUTE format('SELECT %I($1)', validation_record.validation_function)
    USING analysis_data
    INTO is_valid;

    IF NOT is_valid THEN
      issues := issues || jsonb_build_object(
        'rule', validation_record.rule_name,
        'message', validation_record.error_message,
        'severity', validation_record.severity
      );
    END IF;
  END LOOP;

  -- Update document status
  UPDATE application_documents
  SET 
    status = CASE 
      WHEN jsonb_array_length(issues) = 0 THEN 'valid'::document_status
      ELSE 'invalid'::document_status
    END,
    analyzed_at = now(),
    validation_results = jsonb_build_object(
      'is_valid', jsonb_array_length(issues) = 0,
      'issues', issues
    )
  WHERE id = document_id;

  -- Insert analysis results
  INSERT INTO document_analysis_results (
    document_id,
    analysis_type,
    confidence_score,
    extracted_data,
    issues
  ) VALUES (
    document_id,
    analysis_data->>'type',
    (analysis_data->>'confidence')::float,
    analysis_data->'extracted_data',
    issues
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_application_documents_status ON application_documents(status);
CREATE INDEX idx_application_documents_type ON application_documents(document_type_id);
CREATE INDEX idx_document_analysis_results_document ON document_analysis_results(document_id);
CREATE INDEX idx_document_validations_type ON document_validations(document_type_id);

-- Add user_id to applications table if it doesn't exist
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);