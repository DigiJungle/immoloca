-- Update employment contract prompt with specific contract fields
UPDATE document_analysis_prompts 
SET prompt_text = $prompt$Analyze this employment contract and extract the following information in JSON format:

Required fields:
1. contract_type: Type of contract (CDI, CDD, Interim, etc.)
2. employee_name: Full name of employee
3. company_name: Name of the employer
4. position: Job title/position
5. start_date: Contract start date (DD/MM/YYYY)
6. end_date: Contract end date for CDD (DD/MM/YYYY)
7. net_salary: Monthly net salary (number only)
8. gross_salary: Monthly gross salary (number only)
9. working_hours: Weekly working hours (number)
10. trial_period: Trial period duration in months (number)

Validation rules:
- Contract must be signed by both parties
- Start date must be present
- Contract type must be clearly stated
- Salary information must be present
- Working hours must be specified

Return format:
{
  "document_type": "employment_contract",
  "validity_assessment": "Valid|Invalid",
  "extracted_information": {
    "contract_type": string,
    "employee_name": string,
    "company_name": string,
    "position": string,
    "start_date": string,
    "end_date": string,
    "net_salary": number,
    "gross_salary": number,
    "working_hours": number,
    "trial_period": number
  },
  "potential_issues": [string]
}$prompt$,
required_fields = '{
  "contract_type": "string",
  "employee_name": "string",
  "company_name": "string",
  "position": "string",
  "start_date": "string",
  "net_salary": "number",
  "gross_salary": "number",
  "working_hours": "number"
}'::jsonb
WHERE document_type = 'employment_contract';