-- Drop existing function
DROP FUNCTION IF EXISTS validate_payslip_date(text);

-- Create new function with fixed validation logic
CREATE OR REPLACE FUNCTION validate_payslip_date(pay_period text)
RETURNS jsonb AS $$
DECLARE
  today date;
  payslip_date date;
  valid_start_date date;
  valid_end_date date;
  valid_periods text[];
BEGIN
  -- Get current date and truncate to start of month
  today := date_trunc('month', now());
  
  -- Parse payslip date (format: MM/YYYY)
  BEGIN
    payslip_date := to_date(pay_period, 'MM/YYYY');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid_date', false,
      'error', 'Format de date invalide. Utilisez le format MM/YYYY'
    );
  END;
  
  -- Calculate valid date range:
  -- End date: Last day of previous month
  valid_end_date := date_trunc('month', today) - interval '1 day';
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
  
  -- Return validation result with fixed logic
  RETURN jsonb_build_object(
    'valid_date', pay_period = ANY(valid_periods),
    'valid_periods', valid_periods,
    'current_month', to_char(today, 'MM/YYYY'),
    'payslip_month', pay_period
  );
END;
$$ LANGUAGE plpgsql;