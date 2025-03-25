-- Drop existing function first
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
  -- Input validation
  IF pay_period IS NULL OR pay_period = '' THEN
    RETURN jsonb_build_object(
      'valid_date', false,
      'error', 'La période est requise',
      'error_code', 'MISSING_PERIOD'
    );
  END IF;

  -- Format validation (MM/YYYY)
  IF NOT pay_period ~ '^(0[1-9]|1[0-2])/[0-9]{4}$' THEN
    RETURN jsonb_build_object(
      'valid_date', false,
      'error', 'Format de date invalide. Utilisez le format MM/YYYY',
      'error_code', 'INVALID_FORMAT',
      'example', to_char(CURRENT_DATE, 'MM/YYYY')
    );
  END IF;

  -- Parse date
  BEGIN
    payslip_date := to_date(pay_period, 'MM/YYYY');
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid_date', false,
      'error', 'Date invalide',
      'error_code', 'INVALID_DATE'
    );
  END;

  -- Get current date and calculate valid range
  today := CURRENT_DATE;
  valid_end_date := date_trunc('month', today);
  valid_start_date := valid_end_date - interval '3 months';

  -- Generate valid periods
  SELECT array_agg(to_char(d, 'MM/YYYY'))
  INTO valid_periods
  FROM generate_series(
    valid_start_date,
    valid_end_date,
    interval '1 month'
  ) d;

  -- Return validation result
  RETURN jsonb_build_object(
    'valid_date', pay_period = ANY(valid_periods),
    'valid_periods', valid_periods,
    'current_month', to_char(today, 'MM/YYYY'),
    'payslip_month', pay_period,
    'date_info', jsonb_build_object(
      'start_date', to_char(valid_start_date, 'MM/YYYY'),
      'end_date', to_char(valid_end_date, 'MM/YYYY')
    )
  );
END;
$$ LANGUAGE plpgsql;