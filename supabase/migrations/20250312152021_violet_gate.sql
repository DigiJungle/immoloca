-- Consolidate document analysis structure

-- Drop and recreate get_valid_payslip_periods with optimized implementation
DROP FUNCTION IF EXISTS get_valid_payslip_periods();

CREATE OR REPLACE FUNCTION get_valid_payslip_periods()
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  today date;
  valid_start_date date;
  valid_end_date date;
  valid_periods text[];
BEGIN
  -- Get current date
  today := CURRENT_DATE;
  
  -- Calculate valid date range:
  -- End date: Last day of current month
  valid_end_date := date_trunc('month', today) + interval '1 month' - interval '1 day';
  -- Start date: First day of 3 months before current month
  valid_start_date := date_trunc('month', today) - interval '3 months';
  
  -- Generate array of valid periods
  SELECT array_agg(to_char(d, 'MM/YYYY'))
  INTO valid_periods
  FROM generate_series(
    valid_start_date,
    valid_end_date,
    interval '1 month'
  ) d;
  
  RETURN valid_periods;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_valid_payslip_periods() TO PUBLIC;

-- Add comment
COMMENT ON FUNCTION get_valid_payslip_periods() IS 
'Returns an array of valid payslip periods (MM/YYYY) for the last 3 months';

-- Update document_analysis_prompts table with optimized structure
ALTER TABLE document_analysis_prompts 
ADD COLUMN IF NOT EXISTS validation_rules jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS example_format jsonb DEFAULT '{}'::jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_prompts_type ON document_analysis_prompts(document_type);
CREATE INDEX IF NOT EXISTS idx_document_prompts_updated ON document_analysis_prompts(updated_at);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_document_prompts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_document_prompts_timestamp ON document_analysis_prompts;

CREATE TRIGGER trigger_update_document_prompts_timestamp
  BEFORE UPDATE ON document_analysis_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_document_prompts_updated_at();

-- Add function to validate document analysis results
CREATE OR REPLACE FUNCTION validate_document_analysis(
  analysis_result jsonb,
  doc_type text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  prompt_record record;
  validation_result jsonb;
  missing_fields text[];
BEGIN
  -- Get prompt configuration
  SELECT * INTO prompt_record
  FROM document_analysis_prompts
  WHERE document_type::text = doc_type;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Unknown document type',
      'error_code', 'INVALID_TYPE'
    );
  END IF;

  -- Check required fields
  SELECT array_agg(key)
  INTO missing_fields
  FROM jsonb_object_keys(prompt_record.required_fields) key
  WHERE NOT (analysis_result->'extracted_information' ? key);

  -- Build validation result
  validation_result := jsonb_build_object(
    'valid', missing_fields IS NULL,
    'document_type', doc_type,
    'missing_fields', COALESCE(missing_fields, ARRAY[]::text[]),
    'validation_rules', prompt_record.validation_rules,
    'analyzed_at', now()
  );

  -- Add type-specific validation
  CASE doc_type
    WHEN 'payslip' THEN
      IF analysis_result->'extracted_information' ? 'pay_period' THEN
        validation_result := validation_result || 
          validate_payslip_date(analysis_result->'extracted_information'->>'pay_period');
      END IF;
  END CASE;

  RETURN validation_result;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION validate_document_analysis(jsonb, text) TO PUBLIC;

-- Add comment
COMMENT ON FUNCTION validate_document_analysis(jsonb, text) IS 
'Validates document analysis results against defined rules and required fields';