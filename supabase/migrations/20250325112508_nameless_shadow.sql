/*
  # Add short slugs to properties table
  
  1. Changes
    - Add slug column with 8 character unique identifier
    - Add function to generate short slugs
    - Add trigger to automatically generate slugs
    - Update existing properties with short slugs
*/

-- Function to generate a random short slug
CREATE OR REPLACE FUNCTION generate_short_slug()
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer := 0;
  random_index integer;
BEGIN
  WHILE i < 8 LOOP
    random_index := floor(random() * length(chars) + 1);
    result := result || substr(chars, random_index, 1);
    i := i + 1;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add slug column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS properties_slug_key ON properties(slug);

-- Function to ensure slug uniqueness
CREATE OR REPLACE FUNCTION ensure_unique_slug()
RETURNS trigger AS $$
BEGIN
  -- Generate initial slug
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_short_slug();
  END IF;
  
  -- Keep trying until we get a unique slug
  WHILE EXISTS (SELECT 1 FROM properties WHERE slug = NEW.slug AND id != NEW.id) LOOP
    NEW.slug := generate_short_slug();
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new properties
CREATE TRIGGER ensure_property_slug
  BEFORE INSERT OR UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION ensure_unique_slug();

-- Update existing properties with slugs
UPDATE properties 
SET slug = subquery.new_slug
FROM (
  SELECT id, generate_short_slug() as new_slug 
  FROM properties 
  WHERE slug IS NULL
) AS subquery
WHERE properties.id = subquery.id;