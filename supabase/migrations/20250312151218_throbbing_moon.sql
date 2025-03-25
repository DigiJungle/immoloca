/*
  # Fix payslip date validation function

  1. Changes
    - Rename current_date variable to today to avoid conflict
    - Add proper error handling for date parsing
    - Improve validation logic
*/

-- Function to validate payslip date
CREATE OR REPLACE FUNCTION validate_payslip_date(pay_period text)
RETURNS boolean AS $$
DECLARE
  today date;
  payslip_date date;
  three_months_ago date;
BEGIN
  -- Get current date
  today := date_trunc('month', now());
  
  -- Parse payslip date (format: MM/YYYY)
  BEGIN
    payslip_date := to_date(pay_period, 'MM/YYYY');
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  
  -- Calculate date 3 months ago from start of current month
  three_months_ago := date_trunc('month', today - interval '3 months');
  
  -- Check if payslip date is:
  -- 1. Not in the future
  -- 2. Not in current month
  -- 3. Not older than 3 months (excluding current month)
  RETURN payslip_date < today 
    AND payslip_date >= three_months_ago
    AND date_trunc('month', payslip_date) < today;
END;
$$ LANGUAGE plpgsql;