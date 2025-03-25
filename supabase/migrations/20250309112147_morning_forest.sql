-- Create function to calculate application score based on salary-to-rent ratio
CREATE OR REPLACE FUNCTION calculate_application_score(
  salary numeric,
  rent numeric
) RETURNS integer AS $$
DECLARE
  ratio numeric;
BEGIN
  -- If no salary provided, return 0
  IF salary IS NULL OR salary <= 0 OR rent IS NULL OR rent <= 0 THEN
    RETURN 0;
  END IF;

  -- Calculate salary to rent ratio
  ratio := salary / rent;

  -- Return score based on ratio
  -- 100 if ratio >= 3 (meets requirement)
  -- 0 if ratio < 3 (doesn't meet requirement)
  RETURN CASE
    WHEN ratio >= 3 THEN 100
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically calculate and update application score
CREATE OR REPLACE FUNCTION update_application_score()
RETURNS trigger AS $$
DECLARE
  salary numeric;
  property_rent numeric;
BEGIN
  -- Get property rent
  SELECT price INTO property_rent
  FROM properties
  WHERE id = NEW.property_id;

  -- Extract salary from payslips (average of last 3)
  WITH payslip_data AS (
    SELECT 
      AVG((doc->>'net_salary')::numeric) as avg_salary
    FROM jsonb_each(NEW.document_status) doc
    WHERE key LIKE 'payslip_%'
      AND (doc->>'status')::text = 'verified'
  )
  SELECT avg_salary INTO salary FROM payslip_data;

  -- Calculate and update score
  NEW.score := calculate_application_score(salary, property_rent);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update score on application changes
DROP TRIGGER IF EXISTS update_application_score_trigger ON applications;
CREATE TRIGGER update_application_score_trigger
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_score();