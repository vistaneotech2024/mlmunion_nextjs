/*
  # Update user locations

  1. Changes
    - Set default location values for all users:
      - Country: India
      - State: Delhi
      - City: New Delhi
*/

-- Update all profiles with default location values
UPDATE profiles
SET 
  country = 'IN',
  state = 'DL',
  city = 'New Delhi'
WHERE 
  country IS NULL OR
  state IS NULL OR
  city IS NULL;