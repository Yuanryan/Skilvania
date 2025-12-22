# Seed Study Groups - SQL Scripts

This directory contains SQL scripts to create public study groups and add random users to them.

## Which Script to Use?

### Option 1: `seed_study_groups.sql` (Recommended)
- **Best for**: Supabase with full PostgreSQL support
- **Features**: Single script, handles everything automatically
- **Usage**: Copy and paste the entire script into Supabase SQL Editor and run

### Option 2: `seed_study_groups_simple.sql` (Easiest)
- **Best for**: Quick setup, step-by-step execution
- **Features**: Simple queries, easy to understand and modify
- **Usage**: Run each section separately in Supabase SQL Editor

### Option 3: `seed_study_groups_manual.sql` (Most Compatible)
- **Best for**: Older PostgreSQL versions or if DO blocks don't work
- **Features**: Includes alternative manual approach
- **Usage**: Follow the step-by-step instructions in the file

## Quick Start (Recommended)

1. Open Supabase Dashboard → SQL Editor

2. Copy and paste the contents of `seed_study_groups_simple.sql`

3. **Before running**, check your creator user ID:
   ```sql
   SELECT "UserID", "Username" FROM public."USER" ORDER BY "UserID" LIMIT 10;
   ```

4. If needed, modify the creator ID in the script (it uses the first user by default)

5. Run the script

6. Verify with the verification query at the bottom

## What the Scripts Do

1. **Create Public Groups**: Creates one public study group for each course tag
   - Group name: `[Tag Name] Study Group`
   - Description: Auto-generated description
   - Type: `public`

2. **Add Random Users**: Randomly selects and adds users to each group
   - Default: 5 users per group
   - Excludes: Creator and existing members
   - Role: `member`

## Customization

### Change Number of Users Per Group

In `seed_study_groups_simple.sql`, modify this line:
```sql
WHERE rn <= 5  -- Change 5 to your desired number
```

### Use Specific Creator User

Replace this line:
```sql
(SELECT "UserID" FROM public."USER" ORDER BY "UserID" LIMIT 1)
```

With your specific UserID:
```sql
123  -- Your admin UserID
```

## Verification

After running, check the results:

```sql
SELECT 
    sg."GroupID",
    sg."Name",
    t."Name" AS "TagName",
    COUNT(gm."UserID") AS "MemberCount"
FROM study_groups sg
LEFT JOIN public.tag t ON sg."TagID" = t."TagID"
LEFT JOIN group_members gm ON sg."GroupID" = gm."GroupID"
WHERE sg."Type" = 'public'
GROUP BY sg."GroupID", sg."Name", t."Name"
ORDER BY sg."Name";
```

## Troubleshooting

- **"No users found"**: Make sure you have users in the USER table
- **"Permission denied"**: Check that you have INSERT permissions on study_groups and group_members
- **"DO blocks not supported"**: Use the manual version or the simple version
- **"RANDOM() not working"**: Use the manual version which has an alternative approach

