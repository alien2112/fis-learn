export function GET(request: Request) {
  // Prevent `/favicon.ico` from being interpreted as the `[locale]` segment.
  // We already ship `app/icon.png`, so reuse it.
  return Response.redirect(new URL('/icon.png', request.url), 307);
}

