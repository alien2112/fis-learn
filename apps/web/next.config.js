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
    // Tree-shake large icon/animation libraries – reduces initial JS bundle on mobile
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-accordion', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
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
  // Note: CSP is handled per-request by middleware.ts (nonce-based)
  async headers() {
    const securityHeaders = [
      // X-Frame-Options removed to allow YouTube iframes
      // Frame embedding is controlled by CSP frame-ancestors directive in middleware.ts
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      // Allow Private Network Access (for accessing localhost resources from public IP)
      { key: 'Access-Control-Allow-Private-Network', value: 'true' },
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
