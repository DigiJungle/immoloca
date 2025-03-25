-- Create function to generate optimized GPT prompt
CREATE OR REPLACE FUNCTION generate_document_analysis_prompt(
  expected_type text DEFAULT NULL,
  valid_periods text[] DEFAULT NULL
) RETURNS text AS $$
BEGIN
  RETURN format(
    $prompt$
Analyze this document and extract key information:

Document type: [identity|payslip|employment_contract|tax_notice|proof_of_address]
Valid: [true|false]

Extract by type:
- Identity: surname, given_names, nationality, birth_date, doc_number
- Payslip: employee, company, net_salary, period (MM/YYYY)
- Address: provider, type, date, amount, address
- Tax: income, year, parts, address

Rules:
- Payslip period must be in: %s
- Dates: DD/MM/YYYY
- Numbers: use decimal points
- Currency: no symbols

Issues: [list if any]
$prompt$,
    COALESCE(array_to_string(valid_periods, ', '), 'current month')
  );
END;
$$ LANGUAGE plpgsql;

-- Create function to validate document analysis results
CREATE OR REPLACE FUNCTION validate_document_analysis(
  analysis jsonb,
  expected_type text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  validation_result jsonb;
  doc_type text;
  is_valid boolean;
BEGIN
  -- Extract document type
  doc_type := lower(analysis->>'document_type');
  
  -- Basic validation
  IF doc_type IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Document type not detected',
      'error_code', 'NO_TYPE'
    );
  END IF;

  -- Type validation if expected type is provided
  IF expected_type IS NOT NULL AND doc_type != expected_type THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Expected %s document but got %s', expected_type, doc_type),
      'error_code', 'TYPE_MISMATCH'
    );
  END IF;

  -- Type-specific validation
  CASE doc_type
    WHEN 'payslip' THEN
      -- Validate payslip period if present
      IF analysis->'extracted_data'->>'period' IS NOT NULL THEN
        validation_result := validate_payslip_date(analysis->'extracted_data'->>'period');
        is_valid := (validation_result->>'valid_date')::boolean;
      END IF;
      
      -- Validate required fields
      IF analysis->'extracted_data'->>'employee' IS NULL OR
         analysis->'extracted_data'->>'company' IS NULL OR
         analysis->'extracted_data'->>'net_salary' IS NULL THEN
        is_valid := false;
        validation_result := jsonb_build_object(
          'valid', false,
          'error', 'Missing required payslip information',
          'error_code', 'MISSING_FIELDS'
        );
      END IF;

    WHEN 'identity' THEN
      -- Validate required identity fields
      is_valid := analysis->'extracted_data'->>'surname' IS NOT NULL AND
                  analysis->'extracted_data'->>'given_names' IS NOT NULL;

    WHEN 'proof_of_address' THEN
      -- Validate address document date
      is_valid := true; -- Basic validation, can be enhanced

    ELSE
      is_valid := true; -- Default validation
  END CASE;

  -- Return final validation result
  RETURN jsonb_build_object(
    'valid', COALESCE(is_valid, true),
    'document_type', doc_type,
    'validation_details', validation_result
  );
END;
$$ LANGUAGE plpgsql;