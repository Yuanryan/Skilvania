import { NextResponse } from "next/server"
import { NextRequest } from "next/server"

export default async function middleware(req: NextRequest) {
  // Check NextAuth session cookie (NextAuth v5 uses authjs.session-token)
  const sessionToken = req.cookies.get('authjs.session-token') || 
                       req.cookies.get('__Secure-authjs.session-token')
  const isLoggedIn = !!sessionToken
  
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/register') ||
                     req.nextUrl.pathname.startsWith('/auth')
  
  const isNextAuthApi = req.nextUrl.pathname.startsWith('/api/auth')
  
  // Public pages - accessible without authentication
  const isPublicPage = req.nextUrl.pathname === '/' ||
                       req.nextUrl.pathname.startsWith('/about') ||
                       req.nextUrl.pathname.startsWith('/courses/') ||
                       req.nextUrl.pathname === '/courses' ||
                       req.nextUrl.pathname.startsWith('/profile/')
  
  // Public API routes that should work for both logged in and logged out users
  const isPublicApi = req.nextUrl.pathname.startsWith('/api/courses') ||
                      req.nextUrl.pathname.startsWith('/api/tags') ||
                      req.nextUrl.pathname.startsWith('/api/community/match') ||
                      req.nextUrl.pathname.startsWith('/api/community/groups/recommended') ||
                      req.nextUrl.pathname.startsWith('/api/profile/')

  // Allow NextAuth API routes to pass through (they handle their own auth)
  if (isNextAuthApi) {
    return NextResponse.next()
  }

  // Allow public API routes (they handle auth internally when needed)
  if (isPublicApi) {
    return NextResponse.next()
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Allow access to public pages
  if (isPublicPage) {
    return NextResponse.next()
  }

  // Redirect non-logged-in users to login for protected pages
  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images etc)
     * But include NextAuth API routes for authentication
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
