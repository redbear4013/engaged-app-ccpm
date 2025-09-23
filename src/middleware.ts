import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/auth';

// Define protected and public routes
const protectedRoutes = [
  '/dashboard',
  '/profile',
  '/settings',
  '/preferences',
  '/matches',
  '/favorites',
  '/events/create',
  '/events/edit',
  '/subscription',
  '/billing',
];

const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
  '/auth/confirm',
];

const publicRoutes = [
  '/',
  '/events',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/api/health',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes except protected ones to pass through
  if (pathname.startsWith('/api/')) {
    // Check if it's a protected API route
    if (pathname.startsWith('/api/protected/') ||
        pathname.startsWith('/api/user/') ||
        pathname.startsWith('/api/subscription/')) {
      return await handleProtectedRoute(request);
    }
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Handle auth routes (redirect authenticated users away)
  if (isAuthRoute(pathname)) {
    return await handleAuthRoute(request);
  }

  // Handle protected routes (require authentication)
  if (isProtectedRoute(pathname)) {
    return await handleProtectedRoute(request);
  }

  // Allow public routes
  return NextResponse.next();
}

async function handleProtectedRoute(request: NextRequest): Promise<NextResponse> {
  try {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);

    // Get the current session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      // Redirect to signin with return URL
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user profile exists for authenticated users
    if (session.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        // Redirect to profile setup if profile doesn't exist
        const redirectUrl = new URL('/onboarding/profile', request.url);
        redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);

    // On error, redirect to signin
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
}

async function handleAuthRoute(request: NextRequest): Promise<NextResponse> {
  try {
    const response = NextResponse.next();
    const supabase = createMiddlewareSupabaseClient(request, response);

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // User is authenticated, redirect to dashboard or return URL
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/dashboard';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return response;
  } catch (error) {
    console.error('Auth route middleware error:', error);
    return NextResponse.next();
  }
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};