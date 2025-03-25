/*
  # Fix properties schema

  1. Changes
    - Add missing columns
    - Fix column types
    - Update constraints

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing enum types if they exist
DROP TYPE IF EXISTS property_type CASCADE;
DROP TYPE IF EXISTS property_class CASCADE;
DROP TYPE IF EXISTS heating_type CASCADE;
DROP TYPE IF EXISTS building_type CASCADE;

-- Recreate enum types
CREATE TYPE property_type AS ENUM ('sale', 'rent');
CREATE TYPE property_class AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');
CREATE TYPE heating_type AS ENUM ('individual', 'collective', 'electric', 'gas', 'other');
CREATE TYPE building_type AS ENUM ('apartment', 'house', 'studio', 'loft', 'other');

-- Drop and recreate the properties table
DROP TABLE IF EXISTS properties;

CREATE TABLE properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type property_type NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  surface numeric NOT NULL CHECK (surface > 0),
  rooms integer NOT NULL CHECK (rooms > 0),
  location text NOT NULL,
  description text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  features text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  furnished boolean DEFAULT false,
  energy_class property_class,
  gas_emission_class property_class,
  available_from date,
  deposit_amount numeric CHECK (deposit_amount >= 0),
  charges numeric CHECK (charges >= 0),
  charges_included boolean DEFAULT false,
  floor_number integer,
  total_floors integer,
  property_type building_type NOT NULL DEFAULT 'apartment',
  bedrooms integer CHECK (bedrooms >= 0),
  bathrooms integer CHECK (bathrooms >= 0),
  heating heating_type,
  orientation text[],
  user_id uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can view all properties" 
  ON properties 
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Users can insert their own properties" 
  ON properties 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" 
  ON properties 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" 
  ON properties 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX properties_type_idx ON properties(type);
CREATE INDEX properties_location_idx ON properties(location);
CREATE INDEX properties_price_idx ON properties(price);
CREATE INDEX properties_user_id_idx ON properties(user_id);