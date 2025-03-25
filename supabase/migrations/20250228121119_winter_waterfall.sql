-- Display the latest analysis log
DO $$
DECLARE
  latest_log jsonb;
BEGIN
  latest_log := get_latest_analysis_log();
  RAISE NOTICE 'Latest analysis log: %', latest_log;
END;
$$ LANGUAGE plpgsql;