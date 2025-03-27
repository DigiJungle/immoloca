/*
  # Fix property views count update

  1. Changes
    - Add trigger to update views_count in real-time
    - Add function to calculate views count
    - Update existing views counts
*/

-- Create function to update views count
CREATE OR REPLACE FUNCTION update_property_views_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For new view, increment count
    UPDATE properties
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = NEW.property_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- For deleted view, decrement count
    UPDATE properties
    SET views_count = GREATEST(0, COALESCE(views_count, 0) - 1)
    WHERE id = OLD.property_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update views count
DROP TRIGGER IF EXISTS update_views_count_trigger ON property_views;
CREATE TRIGGER update_views_count_trigger
  AFTER INSERT OR DELETE ON property_views
  FOR EACH ROW
  EXECUTE FUNCTION update_property_views_count();

-- Update existing views counts
UPDATE properties p
SET views_count = (
  SELECT COUNT(*)
  FROM property_views v
  WHERE v.property_id = p.id
);