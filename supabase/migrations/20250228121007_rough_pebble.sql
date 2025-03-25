-- Function to get the latest document analysis log
CREATE OR REPLACE FUNCTION get_latest_analysis_log()
RETURNS jsonb AS $$
DECLARE
  latest_log jsonb;
BEGIN
  SELECT analysis_data INTO latest_log
  FROM document_analysis_logs
  ORDER BY analysis_date DESC
  LIMIT 1;
  
  RETURN latest_log;
END;
$$ LANGUAGE plpgsql;