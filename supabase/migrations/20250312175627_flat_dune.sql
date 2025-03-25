-- Get admin user ID
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'bn.leroux@gmail.com';

  -- Update existing properties to associate them with the admin user
  UPDATE properties
  SET user_id = admin_id
  WHERE user_id IS NULL;
END $$;