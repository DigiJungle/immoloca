/*
  # Clean group visits data
  
  1. Changes
    - Delete all existing group visit applications
    - Delete all existing group visits
*/

-- Delete all group visit applications
DELETE FROM group_visit_applications;

-- Delete all group visits
DELETE FROM group_visits;

-- Add comment
COMMENT ON TABLE group_visits IS 'Stores group visit sessions for property viewings';