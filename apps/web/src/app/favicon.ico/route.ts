import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  // Serve icon.png directly to avoid redirect to localhost when behind a proxy
  try {
    const iconPath = path.join(process.cwd(), 'apps/web/src/app/icon.png');
    const file = await readFile(iconPath);
    return new Response(file, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    // Fallback: redirect using x-forwarded headers to get the real host
    return new Response(null, { status: 404 });
  }
}
