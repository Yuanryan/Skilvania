# Supabase Localhost Setup Guide

## Current Setup Status

Your project is currently configured to use **cloud Supabase**:
- URL: `https://ckgsezlgcktyyvnooexl.supabase.co`
- This is a production/cloud instance, not localhost

## Issues Found

### 1. Missing `SUPABASE_SERVICE_ROLE_KEY`
The `src/lib/supabase/admin.ts` file requires this environment variable, but it's missing from your `.env.local`.

**To fix:**
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ckgsezlgcktyyvnooexl
2. Navigate to **Settings → API**
3. Copy the **`service_role` key** (⚠️ Keep this secret! Never commit it to git)
4. Add it to your `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Option 1: Continue Using Cloud Supabase (Current Setup)

**Pros:**
- No local setup needed
- Works immediately
- Same as production environment

**Cons:**
- Uses your cloud database quota
- Changes affect production data
- Requires internet connection

**Current Configuration:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://ckgsezlgcktyyvnooexl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (MISSING - needs to be added)
```

## Option 2: Set Up Local Supabase Development

If you want to run Supabase locally (recommended for development):

### Step 1: Install Supabase CLI

```bash
# macOS (using Homebrew)
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Step 2: Initialize Supabase Locally

```bash
cd /Users/dinoting/Desktop/Dino/Skilvania/Skilvania
supabase init
```

### Step 3: Start Local Supabase

```bash
supabase start
```

This will:
- Start a local PostgreSQL database
- Start local Supabase services (Auth, Storage, etc.)
- Provide you with local credentials

### Step 4: Update `.env.local` for Local Development

After running `supabase start`, you'll get output like:

```
API URL: http://localhost:54321
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkP...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkP...
```

Update your `.env.local`:

```env
# Local Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
```

### Step 5: Apply Database Schema

```bash
# Link to your local project
supabase db reset

# Or apply schema manually
supabase db push
```

### Useful Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View local Supabase dashboard
supabase status

# Reset local database
supabase db reset

# View logs
supabase logs
```

## Option 3: Use Both (Recommended)

You can have different configurations for different environments:

### `.env.local` (Local Development)
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=local-anon-key
SUPABASE_SERVICE_ROLE_KEY=local-service-role-key
```

### `.env.production` (Production)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ckgsezlgcktyyvnooexl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-role-key
```

## Troubleshooting

### Issue: "SUPABASE_SERVICE_ROLE_KEY is not set"
**Solution:** Add the service role key to your `.env.local` file (see Option 1 above)

### Issue: Can't connect to local Supabase
**Solution:** 
1. Check if Supabase is running: `supabase status`
2. Make sure Docker is running (Supabase CLI uses Docker)
3. Try restarting: `supabase stop && supabase start`

### Issue: Schema not applied
**Solution:**
1. Run `supabase db reset` to reset and apply all migrations
2. Or manually run SQL files from `supabase/` directory in Supabase SQL Editor

### Issue: Authentication not working locally
**Solution:**
1. Make sure `NEXTAUTH_URL=http://localhost:3000` is set
2. Check Supabase Auth settings in local dashboard: `http://localhost:54323`
3. Add redirect URLs in Auth settings

## Next Steps

1. **Immediate fix:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`
2. **For local development:** Install Supabase CLI and set up local instance
3. **Verify connection:** Test your app to ensure Supabase is working

## Resources

- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Your Supabase Dashboard](https://supabase.com/dashboard/project/ckgsezlgcktyyvnooexl)

