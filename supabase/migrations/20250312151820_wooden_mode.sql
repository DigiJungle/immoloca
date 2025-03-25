-- Function to get valid payslip periods
CREATE OR REPLACE FUNCTION get_valid_payslip_periods()
RETURNS text[] AS $$
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
$$ LANGUAGE plpgsql;