-- Drop functions
DROP FUNCTION IF EXISTS get_document_prompts(text);
DROP FUNCTION IF EXISTS get_valid_payslip_periods();
DROP FUNCTION IF EXISTS validate_document_analysis(jsonb, text);
DROP FUNCTION IF EXISTS validate_payslip_date(text);
DROP FUNCTION IF EXISTS update_document_prompts_updated_at();

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_document_prompts_timestamp ON document_analysis_prompts;

-- Drop tables
DROP TABLE IF EXISTS document_analysis_prompts CASCADE;
DROP TABLE IF EXISTS document_analysis_logs CASCADE;

-- Drop types
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_status CASCADE;
DROP TYPE IF EXISTS document_category CASCADE;