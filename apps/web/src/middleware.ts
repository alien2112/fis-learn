import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

function buildCsp(nonce: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011/api/v1';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const apiOrigin = (() => {
    try { return new URL(apiUrl).origin; } catch { return apiUrl; }
  })();
  // Include the app origin (may differ from 'self' when behind a proxy) and localhost for dev
  const extraImgSrc = [
    appUrl ? (() => { try { return new URL(appUrl).origin; } catch { return ''; } })() : '',
    'http://localhost:3010',
    'https://i.ytimg.com',
    'https://img.youtube.com',
  ].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' https://www.youtube.com https://s.ytimg.com` + (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''),
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${extraImgSrc} https://images.unsplash.com https://ddcpotfxlsdmdqpnphwl.supabase.co https://maps.gstatic.com https://maps.googleapis.com`,
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin} ws://${apiOrigin.replace(/^https?:\/\//, '')} wss://${apiOrigin.replace(/^https?:\/\//, '')} https://www.youtube.com https://*.googlevideo.com`,
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com https://maps.googleapis.com",
    "media-src 'self' https://www.youtube.com https://*.googlevideo.com blob:",
    "child-src 'self' https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');
}

export default function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  // Run intl routing first to get any redirects or locale cookies
  const intlResponse = intlMiddleware(request);

  // For redirects (e.g., / → /en), add CSP and return immediately
  if (intlResponse.status !== 200) {
    intlResponse.headers.set('Content-Security-Policy', csp);
    return intlResponse;
  }

  // For pass-through requests, create a new response that updates request headers
  // so Next.js reads x-nonce and automatically adds it to its own inline scripts
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Copy cookies/headers set by intl middleware (e.g., NEXT_LOCALE cookie)
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
