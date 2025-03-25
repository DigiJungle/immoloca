-- Function to get valid payslip periods
CREATE OR REPLACE FUNCTION get_valid_payslip_periods(target_date date DEFAULT CURRENT_DATE)
RETURNS text[] AS $$
DECLARE
  valid_start_date date;
  valid_end_date date;
  valid_periods text[];
BEGIN
  -- Calculate valid date range:
  -- End date: Last day of current month (inclusive)
  valid_end_date := date_trunc('month', target_date) + interval '1 month' - interval '1 day';
  -- Start date: First day of 3 months before current month
  valid_start_date := date_trunc('month', target_date) - interval '3 months';
  
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

-- Function to validate payslip date
CREATE OR REPLACE FUNCTION validate_payslip_date(pay_period text)
RETURNS jsonb AS $$
DECLARE
  today date;
  payslip_date date;
  valid_periods text[];
BEGIN
  -- Get current date
  today := CURRENT_DATE;
  
  -- Parse payslip date (format: MM/YYYY)
  BEGIN
    payslip_date := to_date(pay_period, 'MM/YYYY');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid_date', false,
      'error', 'Format de date invalide. Utilisez le format MM/YYYY'
    );
  END;
  
  -- Get valid periods
  valid_periods := get_valid_payslip_periods(today);
  
  -- Return validation result
  RETURN jsonb_build_object(
    'valid_date', pay_period = ANY(valid_periods),
    'valid_periods', valid_periods,
    'current_month', to_char(today, 'MM/YYYY'),
    'payslip_month', pay_period
  );
END;
$$ LANGUAGE plpgsql;