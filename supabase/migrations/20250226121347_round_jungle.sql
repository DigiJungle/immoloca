/*
  # Payslip Sequence Management

  1. New Functions
    - `add_payslip_to_sequence`: Adds a new payslip to an application's sequence
    - `get_missing_payslip_periods`: Returns periods missing from a sequence
    - `update_payslip_sequence_status`: Updates sequence validation status

  2. Changes
    - Adds helper functions for payslip sequence management
    - Adds triggers for automatic sequence validation
*/

-- Function to add a payslip to a sequence
CREATE OR REPLACE FUNCTION add_payslip_to_sequence(
  application_id uuid,
  period text,
  document_id uuid
) RETURNS jsonb AS $$
DECLARE
  current_sequence jsonb;
  validation_result jsonb;
BEGIN
  -- Get current sequence
  SELECT payslip_sequence INTO current_sequence
  FROM applications
  WHERE id = application_id;

  -- Add new period to sequence
  validation_result := check_payslip_sequence(
    (current_sequence->>'periods')::text[],
    period
  );

  -- Update sequence with new period and validation result
  UPDATE applications
  SET payslip_sequence = validation_result || jsonb_build_object(
    'last_updated', now(),
    'documents', COALESCE(
      (current_sequence->'documents')::jsonb || 
      jsonb_build_object(period, document_id),
      jsonb_build_object(period, document_id)
    )
  )
  WHERE id = application_id;

  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get missing periods from a sequence
CREATE OR REPLACE FUNCTION get_missing_payslip_periods(
  application_id uuid
) RETURNS text[] AS $$
DECLARE
  current_sequence jsonb;
  valid_periods text[];
  existing_periods text[];
BEGIN
  -- Get current sequence
  SELECT payslip_sequence INTO current_sequence
  FROM applications
  WHERE id = application_id;

  -- Get valid periods
  valid_periods := get_valid_payslip_periods();
  
  -- Get existing periods
  existing_periods := (current_sequence->>'periods')::text[];

  -- Return missing periods
  RETURN array(
    SELECT p FROM unnest(valid_periods) p
    WHERE NOT p = ANY(existing_periods)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update sequence status
CREATE OR REPLACE FUNCTION update_payslip_sequence_status()
RETURNS trigger AS $$
BEGIN
  -- Validate sequence when a document is added or updated
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.document_status != OLD.document_status) THEN
    IF NEW.document_type = 'payslip' AND (NEW.document_status->>'status')::text = 'verified' THEN
      PERFORM add_payslip_to_sequence(
        NEW.application_id,
        (NEW.metadata->>'pay_period')::text,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sequence validation
DROP TRIGGER IF EXISTS payslip_sequence_validation_trigger ON application_documents;
CREATE TRIGGER payslip_sequence_validation_trigger
  AFTER INSERT OR UPDATE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_payslip_sequence_status();