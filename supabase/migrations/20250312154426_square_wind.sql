/*
  # Add agency name field to profiles table

  1. Changes
    - Add agency_name column to profiles table
*/

-- Add agency_name column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_name text;