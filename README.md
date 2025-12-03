# Skilvania - 興趣技能樹 (Interest Skill Tree)

A modern Next.js application for learning and skill development with Supabase authentication.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + Google OAuth)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20.x or 22.x (Node.js 23+ may have compatibility issues)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skilvania
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings → API to get your project URL and anon key

4. **Configure environment variables**
   - Copy the existing `.env.local` file or create a new one
   - Add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Set up the database schema**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy the contents of `supabase/schema.sql` and run it
   - This will create all necessary tables: ROLES, USER, USERROLE, and the auth bridge

6. **Configure Supabase Authentication**
   - In Supabase Dashboard → Authentication → Providers
   - Enable Google OAuth if desired
   - Add `http://localhost:3000/auth/callback` to redirect URLs

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

The application uses a custom database schema designed according to the data dictionary:

- **ROLES**: Role definitions (愛好者, 設計師, 開發者, etc.)
- **USER**: User profiles with XP and level tracking
- **USERROLE**: Many-to-many relationship between users and roles
- **auth_user_bridge**: Links Supabase auth users to custom USER table

## Features

- 🔐 **Authentication**: Email/password and Google OAuth
- 👤 **User Profiles**: XP and level tracking with role assignments
- 🎯 **Skill Trees**: Hierarchical learning paths (framework in place)
- 🎨 **Modern UI**: Tailwind CSS with dark theme
- 📱 **Responsive**: Mobile-friendly design

## Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── (auth)/         # Authentication routes
│   ├── profile/        # User profiles
│   └── api/            # API routes (if needed)
├── components/         # Reusable components
├── lib/               # Utilities and configurations
│   └── supabase/      # Supabase client setup
└── types/             # TypeScript type definitions

supabase/
└── schema.sql        # Database schema
```

## Troubleshooting

### Common Issues

1. **"npm install" hangs or fails**
   - Delete `node_modules` and `package-lock.json`
   - Run `npm install` again
   - Ensure you're using Node.js 20.x or 22.x

2. **Authentication not working**
   - Verify `.env.local` has correct Supabase credentials
   - Check Supabase dashboard for correct redirect URLs
   - Ensure database schema is properly applied

3. **Database connection issues**
   - Confirm Supabase project is active
   - Check that `supabase/schema.sql` was executed in SQL Editor
   - Verify RLS policies are correctly applied

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.