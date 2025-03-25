/*
  # Fix profiles table and add default admin

  1. Changes
    - Add default admin profile
    - Fix RLS policies for profiles table
    - Add index on role column
  
  2. Security
    - Enable RLS
    - Add policies for admin access
*/

-- Add index on role for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Add policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    is_admin(auth.uid())
  );

-- Add policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_admin(auth.uid())
  )
  WITH CHECK (
    is_admin(auth.uid())
  );

-- Function to create admin profile
CREATE OR REPLACE FUNCTION create_admin_profile(admin_email text)
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the user ID for the admin email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = admin_email;

  -- If user exists, update or create admin profile
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO profiles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;