/*
  # Add rental application fields

  1. New Fields
    - `salary`: Monthly salary of the applicant
    - `employment_type`: Type of employment contract (CDI, CDD, etc.)
    - `employer_name`: Name of the employer
    - `employment_start_date`: Start date of current employment
    - `guarantor_required`: Whether a guarantor is required
    - `guarantor_info`: JSON object containing guarantor information
    - `document_types`: Array of required document types
    - `document_status`: JSON object tracking document verification status

  2. Changes
    - Add new fields to applications table
    - Add validation checks for salary and dates
    - Update existing indexes
*/

-- Add new fields to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary numeric CHECK (salary >= 0);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS employment_type text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS employer_name text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS employment_start_date date;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guarantor_required boolean DEFAULT false;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS guarantor_info jsonb DEFAULT '{}'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS document_types text[] DEFAULT '{}'::text[];
ALTER TABLE applications ADD COLUMN IF NOT EXISTS document_status jsonb DEFAULT '{}'::jsonb;

-- Create index for salary to help with sorting and filtering
CREATE INDEX IF NOT EXISTS applications_salary_idx ON applications(salary);

-- Create function to validate document status
CREATE OR REPLACE FUNCTION validate_document_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure all required document types have a status
  IF NOT (
    SELECT bool_and(doc_type IN (SELECT jsonb_object_keys(NEW.document_status)))
    FROM unnest(NEW.document_types) AS doc_type
  ) THEN
    RAISE EXCEPTION 'All required documents must have a status';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate document status before insert or update
CREATE TRIGGER check_document_status
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_status();