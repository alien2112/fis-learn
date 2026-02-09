const withNextIntl = require('next-intl/plugin')('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fis-learn/ui', '@fis-learn/types', '@fis-learn/utils'],

  // Local machines in this repo can be memory-constrained; CI should run lint/typecheck separately.
  eslint: {
    ignoreDuringBuilds: !process.env.CI,
  },
  typescript: {
    ignoreBuildErrors: !process.env.CI,
  },

  // Enable compression
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // Image optimization (CRITICAL for e-learning)
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'ddcpotfxlsdmdqpnphwl.supabase.co',
      },
    ],
  },

  // Experimental features for performance
  experimental: {
    scrollRestoration: true,
  },

  // Increase webpack memory limit for build stability
  webpack: (config, { isServer }) => {
    // Increase memory for large builds
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };
    return config;
  },

  // Headers for caching and security
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3011';
    const apiOrigin = (() => {
      try { return new URL(apiUrl).origin; } catch { return apiUrl; }
    })();

    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self'" + (process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''),
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https://images.unsplash.com https://ddcpotfxlsdmdqpnphwl.supabase.co",
          "font-src 'self'",
          `connect-src 'self' ${apiOrigin} wss://${apiOrigin.replace(/^https?:\/\//, '')}`,
          "frame-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
        ].join('; '),
      },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    return [
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: securityHeaders,
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects (avoid unnecessary round-trips)
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: true,
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
