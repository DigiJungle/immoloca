-- Drop existing tables
DROP TABLE IF EXISTS group_visit_applications CASCADE;
DROP TABLE IF EXISTS group_visits CASCADE;

-- Create group_visits table
CREATE TABLE group_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  date timestamptz NOT NULL,
  duration integer NOT NULL DEFAULT 20,
  max_visitors integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create group_visit_applications table
CREATE TABLE group_visit_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_visit_id uuid REFERENCES group_visits(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(group_visit_id, application_id)
);

-- Enable RLS
ALTER TABLE group_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_visit_applications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_group_visits_property ON group_visits(property_id);
CREATE INDEX idx_group_visits_date ON group_visits(date);
CREATE INDEX idx_group_visit_apps_visit ON group_visit_applications(group_visit_id);
CREATE INDEX idx_group_visit_apps_application ON group_visit_applications(application_id);
CREATE INDEX idx_group_visit_apps_status ON group_visit_applications(status);

-- Create policies
CREATE POLICY "Property owners can manage group visits"
  ON group_visits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = group_visits.property_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can manage visit applications"
  ON group_visit_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM group_visits v
      JOIN properties p ON p.id = v.property_id
      WHERE v.id = group_visit_applications.group_visit_id
      AND p.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE group_visits IS 'Stores group visit sessions for property viewings';
COMMENT ON TABLE group_visit_applications IS 'Links applications to group visits';