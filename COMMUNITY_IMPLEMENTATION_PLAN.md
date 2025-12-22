# Community Features Implementation Plan

## 🎯 Current Status

### ✅ Phase 1: Profile & Matching (COMPLETED)
- [x] Community profile creation and editing
- [x] Interest tags system
- [x] Smart matching algorithm with compatibility scoring
- [x] Study buddy discovery page
- [x] Database schema (community_profiles, buddy_connections, community_messages)
- [x] RLS policies for security
- [x] Performance optimization (batch queries)
- [x] Removed LookingForBuddy filter (all users visible)
- [x] Fallback recommendations when no matches

## 🚧 Phase 2: Connection System (NEXT)

### Overview
Implement the ability for users to send, accept, and manage buddy connection requests.

### Features to Implement

#### 2.1 Connection Request System
**API Endpoints:**
- [ ] `POST /api/community/connections/request` - Send connection request
  - Request body: `{ receiverID: number }`
  - Creates record in buddy_connections with status 'pending'
  - Prevents duplicate requests
  - Returns connection object

- [ ] `GET /api/community/connections` - Get user's connections
  - Query params: `?status=pending|accepted|rejected` (optional filter)
  - Returns both sent and received connections
  - Includes user details for each connection

- [ ] `PUT /api/community/connections/[connectionId]` - Update connection status
  - Request body: `{ status: 'accepted' | 'rejected' }`
  - Only receiver can update status
  - Returns updated connection

- [ ] `DELETE /api/community/connections/[connectionId]` - Remove connection
  - Allows either user to remove connection
  - Soft delete or hard delete (decide)

**Frontend Components:**
- [ ] Update `BuddyCard.tsx` - Replace alert with actual connection request
- [ ] Create `ConnectionRequestButton.tsx` - Smart button showing connection state
  - States: "Connect", "Request Sent", "Accept/Reject", "Connected"
- [ ] Create `ConnectionsList.tsx` - Display all connections
- [ ] Create `ConnectionRequestItem.tsx` - Individual request with accept/reject buttons

**Pages:**
- [ ] `/community/connections` - View all connections and pending requests
  - Tabs: "My Buddies" | "Pending Requests" | "Sent Requests"
  - Show user cards with connection actions

#### 2.2 Connection Notifications
- [ ] Add notification badge to navbar
- [ ] Show count of pending connection requests
- [ ] Real-time updates using Supabase Realtime subscriptions (optional)
- [ ] Toast notifications when request is accepted/rejected

#### 2.3 My Buddies View
- [ ] Create `/community/buddies` page
- [ ] Show only accepted connections
- [ ] Display buddy activity (last active course, recent progress)
- [ ] Quick actions: Message (Phase 3), View Profile, Remove Connection

### Database Updates
```sql
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_buddy_connections_status_requester 
  ON buddy_connections("Status", "RequesterID");
CREATE INDEX IF NOT EXISTS idx_buddy_connections_status_receiver 
  ON buddy_connections("Status", "ReceiverID");

-- Add constraint to prevent reverse duplicates
-- (Already handled in schema with unique constraint)
```

### Testing Checklist
- [ ] Test connection request flow with 2 users
- [ ] Test duplicate request prevention
- [ ] Test accept/reject flow
- [ ] Test connection removal
- [ ] Test RLS policies (users can only see their own connections)
- [ ] Test edge cases (self-connection, already connected, etc.)

## 🔮 Phase 3: Real-time Communication (FUTURE)

### 3.1 Direct Messaging
**API Endpoints:**
- [ ] `POST /api/community/messages` - Send message
- [ ] `GET /api/community/messages/[userID]` - Get conversation with user
- [ ] `PUT /api/community/messages/[messageID]/read` - Mark message as read
- [ ] `GET /api/community/messages/unread-count` - Get unread message count

**Frontend:**
- [ ] Create `/community/messages` page
- [ ] Create `MessageThread.tsx` - Chat interface
- [ ] Create `MessageList.tsx` - List of conversations
- [ ] Real-time message updates using Supabase Realtime

**Requirements:**
- Only connected buddies can message each other
- Real-time message delivery
- Read receipts
- Message history pagination

### 3.2 Group Features (Optional)
- [ ] Study groups for courses
- [ ] Group chat functionality
- [ ] Course discussion boards
- [ ] Group study session scheduling

## 📊 Additional Enhancements

### 4.1 Enhanced Matching
- [ ] Filter matches by course
- [ ] Filter by level range
- [ ] Search buddies by username
- [ ] Recently active users highlighted
- [ ] "Online now" indicator

### 4.2 Profile Enhancements
- [ ] Profile pictures (avatar upload)
- [ ] Learning goals section
- [ ] Study schedule/availability
- [ ] Timezone display
- [ ] Social links (GitHub, LinkedIn, etc.)

### 4.3 Community Features
- [ ] User reputation system
- [ ] Buddy recommendations based on learning style
- [ ] Study streak tracking with buddies
- [ ] Collaborative achievements
- [ ] Report/block functionality

### 4.4 Analytics
- [ ] Track connection success rate
- [ ] Most popular courses for buddy matching
- [ ] User engagement metrics
- [ ] Connection retention rate

## 🛠️ Implementation Priority

### High Priority (Phase 2 - Next 1-2 weeks)
1. Connection request API endpoints
2. Update BuddyCard with real connection button
3. Create connections list page
4. Add notification badge for pending requests

### Medium Priority (Phase 2 - Week 3-4)
1. My Buddies dedicated page
2. Connection notifications
3. Enhanced connection management
4. Profile view page for other users

### Low Priority (Phase 3 - Future)
1. Direct messaging system
2. Real-time features
3. Group functionality
4. Advanced analytics

## 📝 Notes

### Current Implementation Details
- **Matching Algorithm**: Uses batch queries for performance (3-4 queries total)
- **User Limit**: 200 users max per match query for performance
- **Fallback**: Random 5 users shown if no matches found
- **Scoring**: Shared courses (60%), Level/XP similarity (25%), Interests (15%)

### Technical Considerations
- All community tables use RLS for security
- auth_user_bridge required for Google OAuth users
- MongoDB used for activity logging
- Supabase Realtime can be used for live updates

### UI/UX Guidelines
- Dark theme (bg-deep-forest, bg-slate-900)
- Emerald accent for primary actions
- Blue accent for secondary actions
- Compatibility scores color-coded (emerald/blue/yellow/gray)

## 🚀 Getting Started with Phase 2

### Step 1: Create API Endpoints
Start with the connection request endpoint:
```bash
# Create the file
touch src/app/api/community/connections/request/route.ts
```

### Step 2: Update Frontend
Modify BuddyCard to use real connection system:
```typescript
// In BuddyCard.tsx
const handleConnect = async () => {
  const response = await fetch('/api/community/connections/request', {
    method: 'POST',
    body: JSON.stringify({ receiverID: userID })
  });
  // Handle response...
};
```

### Step 3: Create Connections Page
```bash
# Create the page
touch src/app/(dashboard)/community/connections/page.tsx
```

### Step 4: Add Navigation
Update navbar to include link to connections page and notification badge.

## 📚 Resources
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [NextAuth.js](https://next-auth.js.org/)

