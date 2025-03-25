-- Create enum for document types
CREATE TYPE document_type AS ENUM (
  'identity',
  'payslip',
  'employment_contract',
  'proof_of_address',
  'tax_notice'
);

-- Create table for document analysis prompts
CREATE TABLE document_analysis_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL UNIQUE,
  prompt_text text NOT NULL,
  required_fields jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Function to get prompt by document type
CREATE OR REPLACE FUNCTION get_document_prompt(doc_type document_type)
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT prompt_text 
    FROM document_analysis_prompts 
    WHERE document_type = doc_type
  );
END;
$$ LANGUAGE plpgsql;

-- Insert specific prompts for each document type
INSERT INTO document_analysis_prompts (document_type, prompt_text, required_fields) VALUES
-- Contrat de travail
('employment_contract', 
$prompt$Analyze this employment contract and extract the following information in JSON format:

Required fields:
1. contract_type: Type of contract (CDI, CDD, etc.)
2. employee_name: Full name of employee
3. company_name: Name of the employer
4. net_salary: Monthly net salary (number only)
5. start_date: Contract start date (DD/MM/YYYY)

Validation rules:
- Contract must be signed
- Start date must be present
- Salary must be specified
- Contract type must be clearly stated

Return format:
{
  "document_type": "employment_contract",
  "validity": "Valid|Invalid",
  "extracted_data": {
    "contract_type": string,
    "employee_name": string,
    "company_name": string,
    "net_salary": number,
    "start_date": string
  },
  "issues": [string]
}$prompt$,
'{"contract_type": "string", "employee_name": "string", "company_name": "string", "net_salary": "number", "start_date": "string"}'::jsonb),

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
  "validity": "Valid|Invalid",
  "extracted_data": {
    "employee_name": string,
    "company_name": string,
    "net_salary": number,
    "pay_period": string
  },
  "issues": [string]
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
  "validity": "Valid|Invalid",
  "extracted_data": {
    "surname": string,
    "given_names": string,
    "nationality": string,
    "date_of_birth": string,
    "document_number": string
  },
  "issues": [string]
}$prompt$,
'{"surname": "string", "given_names": "string", "nationality": "string", "date_of_birth": "string", "document_number": "string"}'::jsonb),

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
  "validity": "Valid|Invalid",
  "extracted_data": {
    "provider_name": string,
    "bill_type": string,
    "date": string,
    "amount": number,
    "address": string
  },
  "issues": [string]
}$prompt$,
'{"provider_name": "string", "bill_type": "string", "date": "string", "amount": "number", "address": "string"}'::jsonb);

-- Enable RLS
ALTER TABLE document_analysis_prompts ENABLE ROW LEVEL SECURITY;

-- Create policy for reading prompts
CREATE POLICY "Allow public to read prompts"
  ON document_analysis_prompts
  FOR SELECT
  TO public
  USING (true);