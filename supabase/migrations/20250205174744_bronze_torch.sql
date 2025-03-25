/*
  # Add Analytics and Favorites Tables

  1. New Tables
    - property_views: Track property views
    - favorites: Store user favorites
  2. Indexes
    - Add indexes for better query performance
  3. RLS Policies
    - Set up row level security
*/

-- Create property_views table
CREATE TABLE IF NOT EXISTS property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_property_views_property ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_user ON property_views(user_id);
CREATE INDEX IF NOT EXISTS idx_property_views_date ON property_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property ON favorites(property_id);

-- Enable RLS
ALTER TABLE property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for property_views
CREATE POLICY "Allow insert property views for all"
  ON property_views
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow select property views for property owners"
  ON property_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_views.property_id
      AND properties.user_id = auth.uid()
    )
  );

-- Create policies for favorites
CREATE POLICY "Allow users to manage their own favorites"
  ON favorites
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow users to view their own favorites"
  ON favorites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());