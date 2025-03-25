-- Add tax notice prompt
INSERT INTO document_analysis_prompts (document_type, prompt_text, required_fields) VALUES
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
  "validity": "Valid|Invalid",
  "extracted_data": {
    "reference_income": number,
    "tax_year": string,
    "number_of_parts": number,
    "tax_address": string
  },
  "issues": [string]
}$prompt$,
'{"reference_income": "number", "tax_year": "string", "number_of_parts": "number", "tax_address": "string"}'::jsonb);