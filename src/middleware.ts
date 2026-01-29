import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

// Create next-intl middleware for i18n routing only
// Auth protection is handled at the page/layout level
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(en|id)/:path*']
};

