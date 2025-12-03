# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for Skilvania.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Skilvania")
4. Click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Skilvania
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "Save and Continue"
6. Skip "Scopes" (click "Save and Continue")
7. Add test users if needed (for development)
8. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: Skilvania Web Client
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `http://localhost:3001` (if using alternate port)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/api/auth/callback/google`
5. Click "Create"
6. Copy your **Client ID** and **Client Secret**

## Step 5: Update Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-actual-client-id-here
GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
```

3. Generate a secure NextAuth secret:

```bash
openssl rand -base64 32
```

4. Replace the NEXTAUTH_SECRET:

```env
NEXTAUTH_SECRET=your-generated-secret-here
```

## Step 6: Restart Your Development Server

```bash
npm run dev
```

## Step 7: Test the Authentication

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to the dashboard

## Production Setup

When deploying to production:

1. Update `NEXTAUTH_URL` in `.env.local`:
   ```env
   NEXTAUTH_URL=https://your-production-domain.com
   ```

2. Add your production domain to Google OAuth:
   - Go back to Google Cloud Console → Credentials
   - Edit your OAuth client
   - Add production URLs to:
     - Authorized JavaScript origins: `https://your-domain.com`
     - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`

## Troubleshooting

### "redirect_uri_mismatch" Error
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check that you're using the correct port (3000 or 3001)

### "Access blocked: This app's request is invalid"
- Make sure you've configured the OAuth consent screen
- Add your email as a test user if the app is not published

### Session not persisting
- Make sure `NEXTAUTH_SECRET` is set and is a secure random string
- Clear your browser cookies and try again

## Need Help?

Check the [NextAuth.js Documentation](https://next-auth.js.org/providers/google) for more details.

