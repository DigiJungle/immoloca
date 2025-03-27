/*
  # Fix property views count updates

  1. Changes
    - Add trigger to update views_count in real-time
    - Add function to calculate views count
    - Add views_count column to properties table
*/

-- Add views_count column to properties if it doesn't exist
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- Create function to update views count
CREATE OR REPLACE FUNCTION update_property_views_count()
RETURNS trigger AS $$
BEGIN
  -- Update views_count in properties table
  UPDATE properties
  SET views_count = (
    SELECT COUNT(*)
    FROM property_views
    WHERE property_id = NEW.property_id
  )
  WHERE id = NEW.property_id;
  
  RETURN NEW;
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