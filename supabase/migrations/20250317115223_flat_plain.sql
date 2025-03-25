/*
  # Clean test notifications

  1. Changes
    - Remove all test notifications
*/

-- Delete test notifications
DELETE FROM notifications 
WHERE property_title = 'Bien immobilier' 
OR property_title IS NULL;