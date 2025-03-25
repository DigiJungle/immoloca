-- Update employment contract prompt with simplified fields and company address
UPDATE document_analysis_prompts 
SET prompt_text = $prompt$Analyze this employment contract and extract the following information in JSON format:

Required fields:
1. contract_type: Type of contract (CDI, CDD, Interim, etc.)
2. employee_name: Full name of employee
3. company_name: Name of the employer
4. company_address: Complete address of the company
5. start_date: Contract start date (DD/MM/YYYY)

Validation rules:
- Contract must be signed by both parties
- Start date must be present
- Contract type must be clearly stated
- Company information must be complete

Return format:
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
  "potential_issues": [string]
}$prompt$,
required_fields = '{
  "contract_type": "string",
  "employee_name": "string",
  "company_name": "string",
  "company_address": "string",
  "start_date": "string"
}'::jsonb
WHERE document_type = 'employment_contract';