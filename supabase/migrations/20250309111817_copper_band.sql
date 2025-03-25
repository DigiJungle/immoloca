-- Create function to calculate application score
CREATE OR REPLACE FUNCTION calculate_application_score(
  salary numeric,
  contract_type text,
  employment_duration interval,
  tax_income numeric,
  has_guarantor boolean
) RETURNS integer AS $$
DECLARE
  score integer := 0;
BEGIN
  -- Base score starts at 50
  score := 50;
  
  -- Salary scoring (max 20 points)
  -- Score based on salary to rent/price ratio
  IF salary > 0 THEN
    CASE
      WHEN salary >= 4 * price THEN score := score + 20;
      WHEN salary >= 3 * price THEN score := score + 15;
      WHEN salary >= 2.5 * price THEN score := score + 10;
      WHEN salary >= 2 * price THEN score := score + 5;
    END CASE;
  END IF;

  -- Contract type scoring (max 15 points)
  CASE contract_type
    WHEN 'CDI' THEN score := score + 15;
    WHEN 'CDD' THEN score := score + 10;
    WHEN 'Interim' THEN score := score + 5;
  END CASE;

  -- Employment duration scoring (max 10 points)
  IF employment_duration IS NOT NULL THEN
    CASE
      WHEN employment_duration >= interval '5 years' THEN score := score + 10;
      WHEN employment_duration >= interval '2 years' THEN score := score + 7;
      WHEN employment_duration >= interval '1 year' THEN score := score + 5;
      WHEN employment_duration >= interval '6 months' THEN score := score + 3;
    END CASE;
  END IF;

  -- Tax income scoring (max 10 points)
  IF tax_income > 0 THEN
    CASE
      WHEN tax_income >= salary * 12 * 0.9 THEN score := score + 10;
      WHEN tax_income >= salary * 12 * 0.8 THEN score := score + 7;
      WHEN tax_income >= salary * 12 * 0.7 THEN score := score + 5;
    END CASE;
  END IF;

  -- Guarantor bonus (5 points)
  IF has_guarantor THEN
    score := score + 5;
  END IF;

  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql;

-- Function to automatically calculate and update application score
CREATE OR REPLACE FUNCTION update_application_score()
RETURNS trigger AS $$
DECLARE
  salary numeric;
  contract_type text;
  employment_duration interval;
  tax_income numeric;
  has_guarantor boolean;
BEGIN
  -- Extract salary from payslips (average of last 3)
  WITH payslip_data AS (
    SELECT 
      AVG((doc->>'net_salary')::numeric) as avg_salary
    FROM jsonb_each(NEW.document_status) doc
    WHERE key LIKE 'payslip_%'
      AND (doc->>'status')::text = 'verified'
  )
  SELECT avg_salary INTO salary FROM payslip_data;

  -- Get contract type from employment contract
  SELECT 
    (doc->>'contract_type')::text,
    (NOW() - (doc->>'start_date')::date)
  INTO contract_type, employment_duration
  FROM jsonb_each(NEW.document_status) doc
  WHERE key = 'employment_contract'
    AND (doc->>'status')::text = 'verified';

  -- Get tax income from tax notice
  SELECT 
    (doc->>'reference_income')::numeric
  INTO tax_income
  FROM jsonb_each(NEW.document_status) doc
  WHERE key = 'tax_notice'
    AND (doc->>'status')::text = 'verified';

  -- Check if guarantor is provided
  has_guarantor := NEW.guarantor_required AND NEW.guarantor_info IS NOT NULL;

  -- Calculate and update score
  NEW.score := calculate_application_score(
    salary,
    contract_type,
    employment_duration,
    tax_income,
    has_guarantor
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update score on application changes
DROP TRIGGER IF EXISTS update_application_score_trigger ON applications;
CREATE TRIGGER update_application_score_trigger
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_score();

-- Add score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' 
    AND column_name = 'score'
  ) THEN
    ALTER TABLE applications ADD COLUMN score integer;
  END IF;
END $$;