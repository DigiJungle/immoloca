-- Add payslip_sequence field to applications table if it doesn't exist
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payslip_sequence jsonb DEFAULT '{
  "periods": [],
  "is_valid": false,
  "last_updated": null
}'::jsonb;

-- Function to get valid payslip periods
CREATE OR REPLACE FUNCTION get_valid_payslip_periods(target_date date DEFAULT CURRENT_DATE)
RETURNS text[] AS $$
DECLARE
  valid_start_date date;
  valid_end_date date;
  valid_periods text[];
BEGIN
  -- Calculate valid date range:
  -- End date: Last day of previous month
  valid_end_date := date_trunc('month', target_date) - interval '1 day';
  -- Start date: First day of 3 months before valid_end_date
  valid_start_date := date_trunc('month', valid_end_date) - interval '2 months';
  
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
$$ LANGUAGE plpgsql;

-- Function to check if a payslip period is valid
CREATE OR REPLACE FUNCTION check_payslip_sequence(
  periods text[],
  new_period text,
  target_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb AS $$
DECLARE
  valid_periods text[];
  sorted_periods text[];
  consecutive boolean := true;
  missing_periods text[];
BEGIN
  -- Get valid periods
  valid_periods := get_valid_payslip_periods(target_date);
  
  -- Check if new period is valid
  IF NOT new_period = ANY(valid_periods) THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'periods', periods,
      'issues', array['La période ' || new_period || ' n''est pas valide']
    );
  END IF;
  
  -- Add new period to array if not already present
  IF NOT new_period = ANY(periods) THEN
    periods := array_append(periods, new_period);
  END IF;
  
  -- Sort periods in descending order
  SELECT array_agg(p ORDER BY to_date(p, 'MM/YYYY') DESC)
  INTO sorted_periods
  FROM unnest(periods) p;
  
  -- Check if periods are consecutive
  FOR i IN 1..array_length(sorted_periods, 1)-1 LOOP
    IF to_date(sorted_periods[i], 'MM/YYYY') - interval '1 month' != 
       to_date(sorted_periods[i+1], 'MM/YYYY') THEN
      consecutive := false;
      EXIT;
    END IF;
  END LOOP;
  
  -- Return result
  RETURN jsonb_build_object(
    'is_valid', consecutive AND array_length(sorted_periods, 1) >= 3,
    'periods', sorted_periods,
    'issues', CASE 
      WHEN NOT consecutive THEN ARRAY['Les périodes ne sont pas consécutives']
      WHEN array_length(sorted_periods, 1) < 3 THEN ARRAY['Il manque des bulletins']
      ELSE NULL::text[]
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Function to validate a complete payslip sequence
CREATE OR REPLACE FUNCTION validate_payslip_sequence(application_id uuid)
RETURNS jsonb AS $$
DECLARE
  app_record record;
  sequence_data jsonb;
BEGIN
  -- Get application data
  SELECT * INTO app_record
  FROM applications
  WHERE id = application_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'error', 'Application non trouvée'
    );
  END IF;
  
  -- Get current sequence data
  sequence_data := app_record.payslip_sequence;
  
  -- Validate sequence
  sequence_data := check_payslip_sequence(
    (sequence_data->>'periods')::text[],
    NULL,
    CURRENT_DATE
  );
  
  -- Update application
  UPDATE applications
  SET payslip_sequence = sequence_data || jsonb_build_object('last_updated', now())
  WHERE id = application_id;
  
  RETURN sequence_data;
END;
$$ LANGUAGE plpgsql;