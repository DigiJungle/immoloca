/*
  # Fix property views count

  1. Changes
    - Drop and recreate trigger function with proper locking
    - Add views_count column if missing
    - Reset and recalculate all view counts
*/

-- Add views_count column if it doesn't exist
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS views_count integer DEFAULT 0;

-- Create function to update views count with proper locking
CREATE OR REPLACE FUNCTION update_property_views_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For new view, increment count with row level locking
    UPDATE properties
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = NEW.property_id
    FOR UPDATE;
  ELSIF TG_OP = 'DELETE' THEN
    -- For deleted view, decrement count with row level locking
    UPDATE properties
    SET views_count = GREATEST(0, COALESCE(views_count, 0) - 1)
    WHERE id = OLD.property_id
    FOR UPDATE;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger
DROP TRIGGER IF EXISTS update_views_count_trigger ON property_views;

-- Create new trigger
CREATE TRIGGER update_views_count_trigger
  AFTER INSERT OR DELETE ON property_views
  FOR EACH ROW
  EXECUTE FUNCTION update_property_views_count();

-- Reset all view counts to 0
UPDATE properties SET views_count = 0;

-- Recalculate all view counts
WITH view_counts AS (
  SELECT property_id, COUNT(*) as count
  FROM property_views
  GROUP BY property_id
)
UPDATE properties p
SET views_count = vc.count
FROM view_counts vc
WHERE p.id = vc.property_id;