-- =============================================
-- Update Generic Usernames and Add Random Avatars
-- =============================================
-- This script finds users with generic usernames (like user155, user_123, etc.)
-- and updates them with realistic names and random avatars
-- =============================================

-- Step 1: Create a function to generate realistic names
CREATE OR REPLACE FUNCTION generate_realistic_name()
RETURNS TEXT AS $$
DECLARE
  first_names TEXT[] := ARRAY[
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
    'Sam', 'Jamie', 'Cameron', 'Dakota', 'Blake', 'Sage', 'River', 'Phoenix',
    'Skyler', 'Rowan', 'Finley', 'Hayden', 'Reese', 'Parker', 'Drew', 'Logan',
    'Noah', 'Emma', 'Liam', 'Olivia', 'Ethan', 'Sophia', 'Mason', 'Isabella',
    'Lucas', 'Mia', 'Aiden', 'Charlotte', 'Carter', 'Amelia', 'Jackson', 'Harper',
    'Sebastian', 'Evelyn', 'Henry', 'Abigail', 'Owen', 'Emily', 'Wyatt', 'Elizabeth',
    'Caleb', 'Sofia', 'Nathan', 'Avery', 'Ryan', 'Ella', 'Jack', 'Madison',
    'Luke', 'Scarlett', 'Daniel', 'Victoria', 'Matthew', 'Aria', 'David', 'Grace'
  ];
  last_names TEXT[] := ARRAY[
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
    'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
    'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
    'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards'
  ];
  first_name TEXT;
  last_name TEXT;
BEGIN
  first_name := first_names[1 + floor(random() * array_length(first_names, 1))];
  last_name := last_names[1 + floor(random() * array_length(last_names, 1))];
  RETURN first_name || ' ' || last_name;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create a function to generate avatar URL
CREATE OR REPLACE FUNCTION generate_avatar_url(name TEXT)
RETURNS TEXT AS $$
DECLARE
  initials TEXT;
  colors TEXT[] := ARRAY['3B82F6', '10B981', '8B5CF6', 'F59E0B', 'EF4444', 'EC4899', '14B8A6', '6366F1'];
  bg_color TEXT;
  parts TEXT[];
BEGIN
  -- Extract initials from name
  parts := string_to_array(name, ' ');
  IF array_length(parts, 1) >= 2 THEN
    initials := upper(substring(parts[1], 1, 1) || substring(parts[2], 1, 1));
  ELSIF array_length(parts, 1) = 1 THEN
    initials := upper(substring(parts[1], 1, 2));
  ELSE
    initials := 'U';
  END IF;
  
  -- Pick random color
  bg_color := colors[1 + floor(random() * array_length(colors, 1))];
  
  -- Return UI Avatars URL (UI Avatars handles URL encoding automatically)
  -- We'll use the name parameter directly which UI Avatars will encode
  RETURN 'https://ui-avatars.com/api/?name=' || 
         replace(replace(name, ' ', '+'), '''', '') || 
         '&background=' || bg_color || 
         '&color=FFFFFF&size=256&bold=true&format=png';
END;
$$ LANGUAGE plpgsql;

-- Step 3: Preview users that will be updated (run this first to see what will change)
-- Uncomment the following to preview:
/*
SELECT 
  "UserID",
  "Username" as old_username,
  "Email",
  generate_realistic_name() as new_username,
  generate_avatar_url(generate_realistic_name()) as new_avatar_url
FROM public."USER"
WHERE "Username" ~* '^user[\d_]*\d+$'
  AND length("Username") < 20
ORDER BY "UserID";
*/

-- Step 4: Update users with generic usernames
DO $$
DECLARE
  user_record RECORD;
  new_username TEXT;
  avatar_url TEXT;
  counter INT;
  final_username TEXT;
  updated_count INT := 0;
BEGIN
  -- Loop through users with generic usernames
  FOR user_record IN 
    SELECT "UserID", "Username", "Email"
    FROM public."USER"
    WHERE "Username" ~* '^user[\d_]*\d+$'
      AND length("Username") < 20
    ORDER BY "UserID"
  LOOP
    BEGIN
      -- Generate new name
      new_username := generate_realistic_name();
      avatar_url := generate_avatar_url(new_username);
      final_username := new_username;
      
      -- Check if username already exists
      WHILE EXISTS (
        SELECT 1 FROM public."USER" 
        WHERE "Username" = final_username 
        AND "UserID" != user_record."UserID"
      ) LOOP
        -- If exists, add a number
        counter := COALESCE(counter, 0) + 1;
        final_username := new_username || counter::TEXT;
      END LOOP;
      
      -- Update the user
      UPDATE public."USER"
      SET 
        "Username" = final_username,
        "AvatarURL" = avatar_url,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "UserID" = user_record."UserID";
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Updated UserID %: % -> %', user_record."UserID", user_record."Username", final_username;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update UserID %: %', user_record."UserID", SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Total users updated: %', updated_count;
END $$;

-- Step 5: Clean up functions (optional - uncomment if you want to remove them after use)
-- DROP FUNCTION IF EXISTS generate_realistic_name();
-- DROP FUNCTION IF EXISTS generate_avatar_url(TEXT);

-- =============================================
-- Verification Query
-- =============================================
-- Run this after the update to verify results:
SELECT 
  "UserID",
  "Username",
  "Email",
  CASE 
    WHEN "AvatarURL" IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_avatar,
  "AvatarURL"
FROM public."USER"
WHERE "Username" ~* '^user[\d_]*\d+$'
ORDER BY "UserID";

-- If the above returns 0 rows, all generic usernames have been updated!
-- You can also check a sample of updated users:
SELECT 
  "UserID",
  "Username",
  "AvatarURL"
FROM public."USER"
WHERE "AvatarURL" LIKE 'https://ui-avatars.com/api/%'
ORDER BY "UpdatedAt" DESC
LIMIT 10;

