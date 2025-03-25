/*
  # Create and clear properties table

  1. New Tables
    - `properties`
      - `id` (uuid, primary key)
      - `title` (text)
      - `type` (text)
      - `price` (numeric)
      - `surface` (numeric)
      - `rooms` (integer)
      - `location` (text)
      - `description` (text)
      - `images` (text[])
      - `features` (text[])
      - `created_at` (timestamptz)
      - `furnished` (boolean)
      - `energy_class` (text)
      - `gas_emission_class` (text)
      - `available_from` (timestamptz)
      - `deposit_amount` (numeric)
      - `charges` (numeric)
      - `charges_included` (boolean)
      - `floor_number` (integer)
      - `total_floors` (integer)
      - `property_type` (text)
      - `bedrooms` (integer)
      - `bathrooms` (integer)
      - `heating` (text)
      - `orientation` (text[])
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on properties table
    - Add policies for authenticated users
*/

-- Create enum types for property classifications
CREATE TYPE property_type AS ENUM ('sale', 'rent');
CREATE TYPE property_class AS ENUM ('A', 'B', 'C', 'D', 'E', 'F', 'G');
CREATE TYPE heating_type AS ENUM ('individual', 'collective', 'electric', 'gas', 'other');
CREATE TYPE building_type AS ENUM ('apartment', 'house', 'studio', 'loft', 'other');

-- Create the properties table
CREATE TABLE IF NOT EXISTS properties (
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
  available_from timestamptz,
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
CREATE INDEX IF NOT EXISTS properties_type_idx ON properties(type);
CREATE INDEX IF NOT EXISTS properties_location_idx ON properties(location);
CREATE INDEX IF NOT EXISTS properties_price_idx ON properties(price);
CREATE INDEX IF NOT EXISTS properties_user_id_idx ON properties(user_id);

-- Clear any existing data (if table existed)
TRUNCATE TABLE properties;