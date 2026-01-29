import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { auth } from '@/lib/auth';

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

// Auth routes that should redirect if logged in
const authRoutes = ['/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'];

// Protected routes that require authentication (route groups don't create URL segments)
const protectedRoutes = ['/admin', '/user', '/operator'];

// Admin only routes
const adminRoutes = ['/admin'];

// Operator routes
const operatorRoutes = ['/operator'];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // First, handle i18n routing
  const response = intlMiddleware(request);

  // Get locale from pathname
  const pathnameHasLocale = routing.locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  
  // Extract path without locale
  let pathWithoutLocale = pathname;
  if (pathnameHasLocale) {
    const locale = pathname.split('/')[1];
    pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';
  }

  // Get session using auth
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const userRole = session?.user?.role;

  // Get the locale for redirects
  const locale = pathnameHasLocale ? pathname.split('/')[1] : routing.defaultLocale;

  // Check route types
  const isAuthRoute = authRoutes.some(route => pathWithoutLocale.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(route => pathWithoutLocale.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathWithoutLocale.startsWith(route));
  const isOperatorRoute = operatorRoutes.some(route => pathWithoutLocale.startsWith(route));

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    let redirectPath = '/user';
    if (userRole === 'ADMIN') redirectPath = '/admin';
    else if (userRole === 'OPERATOR') redirectPath = '/operator';
    
    return NextResponse.redirect(new URL(`/${locale}${redirectPath}`, request.url));
  }

  // Redirect non-logged-in users from protected routes
  if (!isLoggedIn && isProtectedRoute) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(new URL(`/${locale}/login?callbackUrl=${callbackUrl}`, request.url));
  }

  // Admin route protection
  if (isAdminRoute && userRole !== 'ADMIN') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/user`, request.url));
  }

  // Operator route protection
  if (isOperatorRoute && userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/user`, request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
