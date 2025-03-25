-- Create enum for document types if it doesn't exist
DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'identity',
    'payslip',
    'employment_contract',
    'proof_of_address',
    'tax_notice'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create document_analysis_prompts table
CREATE TABLE IF NOT EXISTS document_analysis_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  required_fields jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE document_analysis_prompts ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow public to read prompts" ON document_analysis_prompts;

-- Create policy for reading prompts
CREATE POLICY "Allow public to read prompts"
  ON document_analysis_prompts
  FOR SELECT
  TO public
  USING (true);

-- Insert default prompts
INSERT INTO document_analysis_prompts (document_type, prompt_text, required_fields) VALUES
-- Bulletin de salaire
('payslip',
$prompt$Analyze this payslip and extract the following information in JSON format:

Required fields:
1. employee_name: Full name of employee
2. company_name: Name of employer
3. net_salary: Net salary amount (number only)
4. pay_period: Pay period (MM/YYYY)

Validation rules:
- Pay period must be in valid range
- Net salary must be present
- Employee and company names must be visible

Return format:
{
  "document_type": "payslip",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "employee_name": string,
    "company_name": string,
    "net_salary": number,
    "pay_period": string
  },
  "potential_issues": [string]
}$prompt$,
'{"employee_name": "string", "company_name": "string", "net_salary": "number", "pay_period": "string"}'::jsonb),

-- Pièce d'identité
('identity',
$prompt$Analyze this identity document and extract the following information in JSON format:

Required fields:
1. surname: Last name
2. given_names: First name(s)
3. nationality: Nationality
4. date_of_birth: Birth date (DD/MM/YYYY)
5. document_number: ID number

Validation rules:
- Document must not be expired
- All required fields must be present
- Photo must be visible

Return format:
{
  "document_type": "identity",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "surname": string,
    "given_names": string,
    "nationality": string,
    "date_of_birth": string,
    "document_number": string
  },
  "potential_issues": [string]
}$prompt$,
'{"surname": "string", "given_names": "string", "nationality": "string", "date_of_birth": "string", "document_number": "string"}'::jsonb),

-- Contrat de travail
('employment_contract',
$prompt$Analyze this employment contract document and look for:

1. At the top of the document:
   - Company name and full address
   - Company registration details if present

2. In the employee section:
   - Full name of the employee
   - Any personal information provided

3. In the contract details:
   - Type of contract (look for "CDI", "CDD", "Intérim")
   - Start date of the contract
   - Any mention of contract duration or end date

4. Look for signatures:
   - Check if both employer and employee signatures are present
   - Check for signature date

Extract the following information in JSON format:
{
  "document_type": "employment_contract",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "contract_type": string,
    "employee_name": string,
    "company_name": string,
    "company_address": string,
    "start_date": string
  },
  "potential_issues": [
    List any missing or unclear information,
    Note if signatures are missing,
    Flag if contract type is not clearly stated
  ]
}

Validation rules:
- Contract must be signed by both parties
- Start date must be clearly stated
- Contract type must be explicitly mentioned
- Company details must be complete$prompt$,
'{"contract_type": "string", "employee_name": "string", "company_name": "string", "company_address": "string", "start_date": "string"}'::jsonb),

-- Justificatif de domicile
('proof_of_address',
$prompt$Analyze this proof of address document and extract the following information in JSON format:

Required fields:
1. provider_name: Name of service provider
2. bill_type: Type of bill (electricity, water, etc.)
3. date: Document date (DD/MM/YYYY)
4. amount: Bill amount (number only)
5. address: Full address

Validation rules:
- Document must be less than 3 months old
- Address must be complete
- Provider must be recognized

Return format:
{
  "document_type": "proof_of_address",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "provider_name": string,
    "bill_type": string,
    "date": string,
    "amount": number,
    "address": string
  },
  "potential_issues": [string]
}$prompt$,
'{"provider_name": "string", "bill_type": "string", "date": "string", "amount": "number", "address": "string"}'::jsonb),

-- Avis d'imposition
('tax_notice',
$prompt$Analyze this tax notice document and extract the following information in JSON format:

Required fields:
1. reference_income: Reference tax income (number only)
2. tax_year: Tax year (YYYY)
3. number_of_parts: Number of tax parts (number)
4. tax_address: Tax residence address

Validation rules:
- Tax year must be present
- Reference income must be specified
- Number of parts must be valid
- Address must be complete

Return format:
{
  "document_type": "tax_notice",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "reference_income": number,
    "tax_year": string,
    "number_of_parts": number,
    "tax_address": string
  },
  "potential_issues": [string]
}$prompt$,
'{"reference_income": "number", "tax_year": "string", "number_of_parts": "number", "tax_address": "string"}'::jsonb)
ON CONFLICT (document_type) DO UPDATE
SET 
  prompt_text = EXCLUDED.prompt_text,
  required_fields = EXCLUDED.required_fields,
  updated_at = now();