import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { createClient } from "@/lib/supabase/server"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // 只有在 Google OAuth 環境變數都存在時才啟用 Google provider
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code"
              }
            }
          })
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        isSignUp: { label: "Is Sign Up", type: "hidden" },
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const supabase = await createClient();
        const email = credentials.email as string;
        const password = credentials.password as string;
        const isSignUp = credentials.isSignUp === "true";
        const username = credentials.username as string;

        if (isSignUp) {
          // Registration logic
          if (!username) {
            throw new Error("Username is required for registration");
          }

          // Check if user already exists
          const { data: existingUser } = await supabase
            .from('USER')
            .select('UserID')
            .eq('Email', email)
            .single();

          if (existingUser) {
            throw new Error("User with this email already exists");
          }

          // Check if username is taken
          const { data: existingUsername } = await supabase
            .from('USER')
            .select('UserID')
            .eq('Username', username)
            .single();

          if (existingUsername) {
            throw new Error("Username is already taken");
          }

          // Hash password and create user
          const hashedPassword = await bcrypt.hash(password, 10);

          const { data: newUser, error } = await supabase
            .from('USER')
            .insert({
              Username: username,
              Email: email,
              Password: hashedPassword,
            })
            .select()
            .single();

          if (error) {
            console.error("Error creating user:", error);
            throw new Error("Failed to create user");
          }

          return {
            id: newUser.UserID.toString(),
            email: newUser.Email,
            name: newUser.Username,
          };
        } else {
          // Login logic
          const { data: user, error } = await supabase
            .from('USER')
            .select('UserID, Username, Email, Password')
            .eq('Email', email)
            .single();

          if (error || !user) {
            throw new Error("Invalid email or password");
          }

          if (!user.Password) {
            throw new Error("This account uses Google sign-in. Please use Google to sign in.");
          }

          const isValid = await bcrypt.compare(password, user.Password);
          if (!isValid) {
            throw new Error("Invalid email or password");
          }

          return {
            id: user.UserID.toString(),
            email: user.Email,
            name: user.Username,
          };
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          const supabase = await createClient();

          // Check if user exists in our database
          const { data: existingUser } = await supabase
            .from('USER')
            .select('UserID, Username, Email')
            .eq('Email', user.email)
            .single();

          if (!existingUser) {
            // Create new user in our database
            const username = user.email?.split('@')[0] || `user_${Date.now()}`;

            const { data: newUser, error } = await supabase
              .from('USER')
              .insert({
                Username: username,
                Email: user.email,
              })
              .select()
              .single();

            if (error) {
              console.error("Error creating user:", error);
              return false;
            }

            // Store user ID in the user object
            user.id = newUser.UserID.toString();
          } else {
            // Update last activity
            await supabase
              .from('USER')
              .update({ UpdatedAt: new Date().toISOString() })
              .eq('UserID', existingUser.UserID);

            user.id = existingUser.UserID.toString();
          }

          return true;
        } catch (error) {
          console.error("Sign in error:", error);
          return false;
        }
      }
      // For credentials provider, the authorize function already handled validation
      return true;
    },
    async jwt({ token, user, account }) {
      // Add user ID to token on first sign in
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
})

