import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Don't prefix default locale (en)
});

// Next.js includes the basePath in request.nextUrl.pathname, but next-intl
// doesn't account for this — so we strip it manually before processing.
const BASE_PATH = '/admin';

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(BASE_PATH)) {
    const strippedPath = pathname.slice(BASE_PATH.length) || '/';

    // Pass _next static assets and internals straight through.
    // The matcher pattern can't exclude them when they're prefixed with the
    // basePath (e.g. /admin/_next/...), so we guard here instead.
    if (strippedPath.startsWith('/_next/') || strippedPath.startsWith('/api/')) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = strippedPath;
    return intlMiddleware(new NextRequest(url, request));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon.ico|robots.txt).*)'],
};
