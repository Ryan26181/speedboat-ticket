import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { auth } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/rate-limit';
import { requestSizeMiddleware } from '@/middleware/request-size';
import { csrfMiddleware, setCsrfCookie } from '@/middleware/csrf';

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
  
  // Skip middleware for static files
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // ============================================
  // API ROUTE SECURITY
  // ============================================
  if (pathname.startsWith('/api/')) {
    // 1. Request size limiting
    const sizeCheck = requestSizeMiddleware(request);
    if (sizeCheck) return sizeCheck;
    
    // 2. Rate limiting
    const rateCheck = rateLimitMiddleware(request);
    if (rateCheck) return rateCheck;
    
    // 3. CSRF validation (skip webhooks and auth routes)
    if (!pathname.includes('/webhook') && 
        !pathname.includes('/notification') &&
        !pathname.includes('/cron') &&
        !pathname.startsWith('/api/auth/') &&
        !pathname.startsWith('/api/csrf')) {
      const csrfCheck = await csrfMiddleware(request);
      if (csrfCheck) return csrfCheck;
    }
    
    // Add security headers to API responses
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  }

  // ============================================
  // PAGE ROUTE HANDLING
  // ============================================

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

  // ============================================
  // SET CSRF COOKIE FOR PAGES
  // ============================================
  const finalResponse = response || NextResponse.next();
  
  // Set CSRF cookie if not present
  if (!request.cookies.get('csrf_token')) {
    setCsrfCookie(finalResponse);
  }
  
  // Add security headers to page responses
  finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
  finalResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  finalResponse.headers.set('X-XSS-Protection', '1; mode=block');
  finalResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return finalResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
