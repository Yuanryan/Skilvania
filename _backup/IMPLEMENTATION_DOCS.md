# Skilvania Project Documentation

## 1. Implemented Pages

The Skilvania frontend has been fully scaffolded using Next.js 15+ (App Router). Below is a comprehensive list of all implemented routes and their functions.

### Public Routes
| Path | Description | Components Used |
| :--- | :--- | :--- |
| `/` | **Landing Page**: Hero section with animations, feature highlights, and call-to-actions. | `Navbar` |
| `/about` | **About Page**: Static page explaining the philosophy behind Skilvania. | `Navbar` |
| `/courses` | **Course Catalog**: Searchable and filterable list of available skill trees. | `Navbar` |
| `/courses/[courseId]` | **Course Overview**: Detailed view of a specific course (rating, author, description). | `Navbar` |
| `/profile/[username]` | **Public Profile**: User's "Garden" showing stats, badges, and active trees. | `Navbar` |

### Auth Routes
| Path | Description | Components Used |
| :--- | :--- | :--- |
| `/login` | **Login Page**: Email/Password login form with visual flair. | - |
| `/register` | **Register Page**: New user registration form. | - |

### Learner Routes (Protected)
| Path | Description | Components Used |
| :--- | :--- | :--- |
| `/dashboard` | **User Dashboard**: Personal hub showing active quests, daily streak, and XP. | `Navbar` |
| `/leaderboard` | **Leaderboard**: Gamified ranking of users by XP/Level. | `Navbar` |
| `/settings` | **User Settings**: Profile management (avatar, notifications, privacy). | `Navbar` |
| `/courses/[courseId]/tree` | **Interactive Tree**: The core learning interface. Users click nodes to unlock lessons. | `OrganicTree`, `OrganicNode`, `TreeBranch` |
| `/courses/[courseId]/learn/[nodeId]` | **Lesson Content**: The actual study page with video/text/quiz. | `Navbar` |

### Creator Routes (Protected)
| Path | Description | Components Used |
| :--- | :--- | :--- |
| `/creator` | **Creator Dashboard**: Overview of created courses and student stats. | `Navbar` |
| `/creator/[courseId]/editor` | **Tree Editor**: Drag-and-drop interface to design skill trees and link nodes. | `OrganicTree` (Creator Mode) |
| `/creator/[courseId]/content/[nodeId]` | **Content Editor**: WYSIWYG-style editor for writing lesson materials. | `Navbar` |
| `/creator/[courseId]/submissions` | **Submission Review**: Interface for grading student project submissions. | `Navbar` |

---

## 2. Implementation Details

### Core Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4 (using CSS variables for "Deep Forest" theme)
- **Animation**: Framer Motion (for UI interactions) + CSS Keyframes (for SVG path growth)
- **Icons**: Lucide React

### The "Organic Tree" Engine
The standout feature of Skilvania is its visualization engine, located in `src/components/visualization`.

1.  **`OrganicTree.tsx`**:
    -   Acts as the main canvas container.
    -   Manages the SVG `viewBox` (0 0 800 800) to ensure consistent coordinate scaling across devices.
    -   Handles global SVG filters (e.g., `<feTurbulence>` for the rough/hand-drawn look).
    -   Distinguishes between **Creator Mode** (drag-and-drop enabled) and **Learner Mode** (click-to-view).

2.  **`OrganicNode.tsx`**:
    -   Renders individual skill nodes as `div` elements absolutely positioned on top of the SVG.
    -   Uses **percentage-based positioning** (`left: ${x/800*100}%`) to remain responsive.
    -   States: `Locked` (Gray), `Unlocked` (Pulsing Green), `Completed` (Solid Green).

3.  **`TreeBranch.tsx`**:
    -   Renders the connections between nodes using SVG Cubic Bezier curves (`path` with `d="M... C..."`).
    -   **Animation**: Uses CSS `@keyframes growBranch` to animate `stroke-dashoffset`, simulating a vine growing from start to end.
    -   **Roughness**: Applies the SVG turbulence filter to give lines a natural, organic texture.

### Data Management (Current State)
Currently, the application uses **Mock Data** embedded directly in page components (e.g., `INITIAL_NODES` in `tree/page.tsx`). This allows for rapid UI prototyping without backend dependency.

---

## 3. Future Backend Integration (What to Add)

To turn this prototype into a fully functional application, the following Backend APIs and Database Schemas are required.

### Recommended Stack
- **Database**: PostgreSQL (via Supabase or Neon)
- **ORM**: Prisma
- **Auth**: NextAuth.js (v5)

### Required API Endpoints

#### 1. User & Auth
- `POST /api/auth/register`: Create new user.
- `GET /api/user/profile`: Fetch current user stats (XP, Level).
- `PUT /api/user/settings`: Update preferences.

#### 2. Course Management
- `GET /api/courses`: Fetch catalog with pagination/filtering.
- `POST /api/courses`: Create a new course draft.
- `GET /api/courses/[id]/tree`: **CRITICAL**. Must return the full JSON structure of Nodes and Edges for the Tree Engine.

#### 3. Progress Tracking
- `GET /api/progress/[courseId]`: Fetch user's completion status for specific nodes.
- `POST /api/progress/complete`: Mark a node as complete (and award XP).
    - *Logic*: Should check server-side if prerequisites are met before unlocking.

#### 4. Creator Studio
- `PUT /api/courses/[id]/nodes`: Batch update node positions (from Drag-and-Drop editor).
- `POST /api/courses/[id]/content`: Save rich text content for a specific node.
- `GET /api/submissions`: Fetch pending student projects.

### Database Schema Extensions

We need to ensure the database supports the graph structure of the trees.

```prisma
model Course {
  id          String @id @default(cuid())
  title       String
  creatorId   String
  nodes       Node[]
  edges       Edge[]
}

model Node {
  id          String @id @default(cuid())
  courseId    String
  title       String
  type        String // 'theory' | 'code' | 'project'
  x           Int    // 0-800 coordinate
  y           Int    // 0-800 coordinate
  xpReward    Int
  content     String? // Rich text HTML/Markdown
}

model Edge {
  id          String @id @default(cuid())
  fromNodeId  String
  toNodeId    String
  courseId    String
}

model UserProgress {
  userId      String
  nodeId      String
  status      String // 'locked' | 'unlocked' | 'completed'
  completedAt DateTime?
}
```

### Next Steps
1.  **Set up Prisma**: Initialize the database schema.
2.  **Replace Mock Data**: Create React Context or Zustand stores to fetch data from real API endpoints.
3.  **Implement Auth**: Secure the Dashboard and Creator routes.

