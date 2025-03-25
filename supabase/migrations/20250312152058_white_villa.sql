-- Function to get all prompts or a specific one
CREATE OR REPLACE FUNCTION get_document_prompts(doc_type text DEFAULT NULL)
RETURNS TABLE (
  document_type text,
  prompt_text text,
  required_fields jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.document_type::text,
    p.prompt_text,
    p.required_fields
  FROM document_analysis_prompts p
  WHERE 
    doc_type IS NULL 
    OR p.document_type::text = doc_type;
END;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION get_document_prompts(text) TO PUBLIC;

-- Add comment
COMMENT ON FUNCTION get_document_prompts(text) IS 
'Returns all document analysis prompts or a specific one if document_type is provided';