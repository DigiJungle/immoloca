/*
  # Update group visits duration

  1. Changes
    - Update default duration to 40 minutes
    - Add comment explaining duration calculation
*/

-- Update default duration for group_visits table
ALTER TABLE group_visits 
ALTER COLUMN duration SET DEFAULT 40;

-- Add comment explaining duration calculation
COMMENT ON COLUMN group_visits.duration IS 'Duration in minutes (20 minutes per visitor)';