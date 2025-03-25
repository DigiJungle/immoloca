-- Update employment contract prompt with specific analysis instructions
UPDATE document_analysis_prompts 
SET prompt_text = $prompt$Analyze this employment contract document and look for:

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
required_fields = '{
  "contract_type": "string",
  "employee_name": "string",
  "company_name": "string",
  "company_address": "string",
  "start_date": "string"
}'::jsonb
WHERE document_type = 'employment_contract';