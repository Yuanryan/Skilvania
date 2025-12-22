# Community & Study Buddy System

## Overview

The Community & Study Buddy System allows users to connect with fellow learners who share similar learning progress, interests, and course enrollment. This feature helps create a collaborative learning environment where users can find study partners and support each other's learning journey.

## Features

### 1. Community Profile
- **Personal Bio**: Users can write a short bio to introduce themselves to the community
- **Interest Tags**: Add up to 10 interest tags to help match with like-minded learners
- **Availability Toggle**: Control whether you're actively looking for study buddies
- **Auto-tracking**: The system automatically tracks your last active course

### 2. Smart Matching Algorithm
The matching system calculates compatibility scores based on:
- **Shared Courses (60% weight)**: Users studying the same courses get highest priority
- **Similar XP/Level (25% weight)**: Matches users with similar learning progress
- **Common Interests (15% weight)**: Considers shared interest tags

Compatibility scores range from 0-100%, with the following ratings:
- 80-100%: Excellent Match
- 60-79%: Great Match
- 40-59%: Good Match
- 0-39%: Fair Match

### 3. User Discovery
- Browse recommended study buddies based on your learning profile
- View shared courses and interests at a glance
- See compatibility scores for each potential buddy
- Refresh matches to see updated recommendations

## Database Schema

### Tables Created

#### `community_profiles`
Stores user community information:
- `ProfileID`: Primary key
- `UserID`: Foreign key to USER table (unique)
- `Bio`: Text description (max 200 chars)
- `Interests`: Array of interest tags
- `LookingForBuddy`: Boolean availability flag
- `LastActiveCourseID`: Tracks recent activity
- `CreatedAt`, `UpdatedAt`: Timestamps

#### `buddy_connections`
Manages connection requests between users:
- `ConnectionID`: Primary key
- `RequesterID`: User who sent the request
- `ReceiverID`: User who received the request
- `Status`: 'pending', 'accepted', or 'rejected'
- `CreatedAt`, `UpdatedAt`: Timestamps

#### `community_messages`
Stores direct messages (for Phase 3):
- `MessageID`: Primary key
- `SenderID`: Message sender
- `ReceiverID`: Message receiver
- `Content`: Message text
- `IsRead`: Read status
- `CreatedAt`: Timestamp

### Row Level Security (RLS)
All community tables have RLS policies enabled to ensure:
- Users can view all public community profiles
- Users can only edit their own profile
- Users can only see connections they're involved in
- Users can only view messages they sent or received

## API Endpoints

### Profile Management

#### `GET /api/community/profile`
Fetches the current user's community profile.

**Response:**
```json
{
  "profile": {
    "userID": 123,
    "bio": "Passionate about web development",
    "interests": ["JavaScript", "React", "TypeScript"],
    "lookingForBuddy": true,
    "lastActiveCourseID": 5,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T12:00:00Z"
  }
}
```

#### `POST /api/community/profile`
Creates or updates the current user's community profile.

**Request Body:**
```json
{
  "bio": "Passionate about web development",
  "interests": ["JavaScript", "React", "TypeScript"],
  "lookingForBuddy": true,
  "lastActiveCourseID": 5
}
```

**Response:**
```json
{
  "success": true,
  "profile": { /* updated profile data */ }
}
```

### Matching Engine

#### `GET /api/community/match`
Fetches recommended study buddies for the current user.

**Response:**
```json
{
  "matches": [
    {
      "userID": 456,
      "username": "john_doe",
      "level": 5,
      "xp": 2500,
      "bio": "Learning full-stack development",
      "interests": ["JavaScript", "Node.js"],
      "sharedCourses": [
        {
          "courseId": 1,
          "courseTitle": "Introduction to JavaScript"
        }
      ],
      "compatibilityScore": 85
    }
  ],
  "totalMatches": 15
}
```

## Setup Instructions

### 1. Run Database Migration

Execute the community schema SQL file in your Supabase project:

```bash
# Using Supabase CLI
supabase db reset

# Or manually in Supabase Dashboard
# Navigate to SQL Editor and run: supabase/community_schema.sql
```

### 2. Verify Tables

Check that the following tables were created:
- `community_profiles`
- `buddy_connections`
- `community_messages`

### 3. Access the Community Page

Navigate to `/community` in your application. The page should:
- Display your community profile editing interface
- Show recommended study buddies based on your course progress
- Allow you to update your bio and interests

## Usage Guide

### For Users

1. **Set Up Your Profile**
   - Navigate to the Community page
   - Click the settings icon on your profile card
   - Add a bio and interest tags
   - Toggle "Looking for study buddies" on/off

2. **Find Study Buddies**
   - Browse the recommended buddies list
   - Look for high compatibility scores
   - Check shared courses and interests
   - Click "Connect" to send a connection request (Phase 2)

3. **Manage Your Availability**
   - Toggle "Looking for study buddies" off when you're not actively seeking partners
   - This removes you from other users' recommendation lists

### For Developers

#### Adding Custom Matching Criteria

Edit `src/app/api/community/match/route.ts` to adjust scoring:

```typescript
// Adjust weights in the scoring algorithm
score += Math.min(sharedCourses.length * 30, 60); // Course weight
// Add more criteria as needed
```

#### Customizing Profile Fields

Modify the schema in `supabase/community_schema.sql` and update corresponding API endpoints and frontend forms.

## Future Enhancements (Phase 2 & 3)

### Phase 2: Connection System
- [ ] Implement buddy connection requests
- [ ] Add connection acceptance/rejection flow
- [ ] Create "My Buddies" view
- [ ] Add connection notifications

### Phase 3: Real-time Communication
- [ ] Direct messaging between connected buddies
- [ ] Real-time message notifications using Supabase Realtime
- [ ] Group chat for users in the same course
- [ ] Discussion boards per course

### Additional Ideas
- [ ] Study session scheduling
- [ ] Buddy recommendations based on online status
- [ ] Community events and challenges
- [ ] Reputation and badges system
- [ ] Report/block functionality

## Styling

The Community feature uses the same dark theme styling as the rest of Skilvania:
- **Background**: Deep forest dark theme (`bg-deep-forest`)
- **Cards**: Slate-900 with white/10 borders
- **Accent Colors**: Emerald for primary actions, blue for secondary
- **Text**: White for headings, slate-400 for body text
- **Hover Effects**: Emerald border glow on interactive elements

## Troubleshooting

### No Matches Found
- Ensure you have started at least one course
- Check that your profile has "Looking for buddies" enabled
- Verify other users exist in the database with course progress

### Profile Not Saving
- Check browser console for API errors
- Verify Supabase RLS policies are correctly configured
- Ensure you're logged in with a valid session

### API Error "Failed to fetch profile"
- Verify you're logged in (check session in browser dev tools)
- Ensure the `/api/community/profile` endpoint is accessible
- Check Supabase connection and RLS policies
- Try logging out and back in to refresh your session

### Matches Not Updating
- Click the "Refresh" button to fetch latest recommendations
- Clear browser cache if stale data persists
- Check that user progress is being tracked in `userprogress` table

### Page Looks Different from Rest of Site
- If the community page doesn't match the site styling, ensure:
  - The Navbar component is included at the top
  - Dark theme classes are used (bg-deep-forest, bg-slate-900, etc.)
  - You've cleared your browser cache after updates

## Contributing

To contribute to the community features:
1. Follow the existing code patterns in `src/app/api/community/`
2. Update this documentation for any new features
3. Add appropriate RLS policies for new tables
4. Test with multiple user accounts to verify matching algorithm

## License

Part of the Skilvania project.

