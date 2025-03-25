-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_document_prompts_timestamp ON document_analysis_prompts;
DROP TRIGGER IF EXISTS payslip_sequence_validation_trigger ON application_documents;

-- Drop functions with CASCADE to handle dependencies
DROP FUNCTION IF EXISTS get_document_prompts(text) CASCADE;
DROP FUNCTION IF EXISTS get_valid_payslip_periods() CASCADE;
DROP FUNCTION IF EXISTS validate_document_analysis(jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS validate_payslip_date(text) CASCADE;
DROP FUNCTION IF EXISTS update_document_prompts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_document_analysis_prompt(text, text[]) CASCADE;
DROP FUNCTION IF EXISTS calculate_salary_stats(jsonb) CASCADE;
DROP FUNCTION IF EXISTS check_payslip_sequence(text[], text, date) CASCADE;
DROP FUNCTION IF EXISTS validate_payslip_sequence(uuid) CASCADE;
DROP FUNCTION IF EXISTS add_payslip_to_sequence(uuid, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_missing_payslip_periods(uuid) CASCADE;
DROP FUNCTION IF EXISTS update_payslip_sequence_status() CASCADE;

-- Drop tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS document_analysis_prompts CASCADE;
DROP TABLE IF EXISTS document_analysis_logs CASCADE;
DROP TABLE IF EXISTS document_validations CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS document_analysis_results CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;

-- Drop types with CASCADE to handle dependencies
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS document_category CASCADE;