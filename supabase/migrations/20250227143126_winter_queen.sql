/*
  # Improve payslip validation system

  1. New Functions
    - Add salary validation
    - Add document status tracking
    - Add sequence completion check
  
  2. Changes
    - Enhance payslip sequence validation
    - Add salary history tracking
    - Add validation logs
*/

-- Add salary_history to payslip_sequence
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS salary_history jsonb DEFAULT '{"history": [], "average": null, "variation": null}'::jsonb;

-- Function to calculate salary statistics
CREATE OR REPLACE FUNCTION calculate_salary_stats(salary_history jsonb)
RETURNS jsonb AS $$
DECLARE
  avg_salary numeric;
  max_variation numeric;
  min_salary numeric;
  max_salary numeric;
BEGIN
  -- Calculate average salary
  SELECT 
    avg(value::numeric),
    min(value::numeric),
    max(value::numeric)
  INTO avg_salary, min_salary, max_salary
  FROM jsonb_array_elements(salary_history->'history') AS h(value);
  
  -- Calculate maximum variation (as percentage)
  IF avg_salary > 0 THEN
    max_variation := greatest(
      abs(max_salary - avg_salary) / avg_salary * 100,
      abs(min_salary - avg_salary) / avg_salary * 100
    );
  ELSE
    max_variation := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'average', avg_salary,
    'variation', max_variation,
    'min', min_salary,
    'max', max_salary
  );
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to add payslip to sequence
CREATE OR REPLACE FUNCTION add_payslip_to_sequence(
  application_id uuid,
  period text,
  document_id uuid,
  salary numeric
) RETURNS jsonb AS $$
DECLARE
  current_sequence jsonb;
  current_salary_history jsonb;
  validation_result jsonb;
  salary_stats jsonb;
BEGIN
  -- Get current sequence and salary history
  SELECT 
    payslip_sequence,
    salary_history 
  INTO current_sequence, current_salary_history
  FROM applications
  WHERE id = application_id;

  -- Update salary history
  IF current_salary_history IS NULL THEN
    current_salary_history := jsonb_build_object('history', '[]'::jsonb);
  END IF;

  current_salary_history := jsonb_set(
    current_salary_history,
    '{history}',
    (current_salary_history->'history') || to_jsonb(salary)
  );

  -- Calculate salary statistics
  salary_stats := calculate_salary_stats(current_salary_history);

  -- Validate sequence with new period
  validation_result := check_payslip_sequence(
    (current_sequence->>'periods')::text[],
    period
  );

  -- Add salary validation
  IF (salary_stats->>'variation')::numeric > 20 THEN
    validation_result := jsonb_set(
      validation_result,
      '{issues}',
      (validation_result->'issues') || 
      jsonb_build_array('Variation de salaire supérieure à 20%')
    );
    validation_result := jsonb_set(
      validation_result,
      '{is_valid}',
      'false'::jsonb
    );
  END IF;

  -- Update sequence with new data
  UPDATE applications
  SET 
    payslip_sequence = validation_result || jsonb_build_object(
      'last_updated', now(),
      'documents', COALESCE(
        (current_sequence->'documents')::jsonb || 
        jsonb_build_object(
          period, 
          jsonb_build_object(
            'id', document_id,
            'salary', salary,
            'validated_at', now()
          )
        ),
        jsonb_build_object(
          period, 
          jsonb_build_object(
            'id', document_id,
            'salary', salary,
            'validated_at', now()
          )
        )
      )
    ),
    salary_history = current_salary_history || salary_stats
  WHERE id = application_id;

  -- Log the validation
  INSERT INTO document_analysis_logs (
    analysis_date,
    analysis_data
  ) VALUES (
    now(),
    jsonb_build_object(
      'type', 'payslip_sequence_validation',
      'application_id', application_id,
      'period', period,
      'salary', salary,
      'validation_result', validation_result,
      'salary_stats', salary_stats
    )
  );

  RETURN validation_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check sequence completion
CREATE OR REPLACE FUNCTION check_sequence_completion(application_id uuid)
RETURNS boolean AS $$
DECLARE
  sequence_data jsonb;
  required_count integer := 3;
  current_count integer;
  is_consecutive boolean;
  last_period text;
  current_period text;
BEGIN
  -- Get sequence data
  SELECT payslip_sequence INTO sequence_data
  FROM applications
  WHERE id = application_id;

  -- Count valid documents
  SELECT count(*)
  INTO current_count
  FROM jsonb_array_elements_text(sequence_data->'periods');

  -- Check if we have enough documents
  IF current_count < required_count THEN
    RETURN false;
  END IF;

  -- Check if periods are consecutive
  is_consecutive := true;
  last_period := NULL;

  FOR current_period IN
    SELECT jsonb_array_elements_text(sequence_data->'periods')
    ORDER BY to_date(value, 'MM/YYYY') DESC
  LOOP
    IF last_period IS NOT NULL THEN
      IF to_date(last_period, 'MM/YYYY') - interval '1 month' !=
         to_date(current_period, 'MM/YYYY') THEN
        is_consecutive := false;
        EXIT;
      END IF;
    END IF;
    last_period := current_period;
  END LOOP;

  RETURN is_consecutive;
END;
$$ LANGUAGE plpgsql;