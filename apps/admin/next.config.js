const withNextIntl = require('next-intl/plugin')('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/admin',
  // assetPrefix ensures ALL static chunks (including shared framework chunks
  // like webpack runtime) are served under /admin/_next/... so nginx can
  // correctly proxy them to this container rather than the web container.
  assetPrefix: '/admin',
  transpilePackages: ['@fis-learn/ui', '@fis-learn/types', '@fis-learn/utils'],

  // Local machines in this repo can be memory-constrained; CI should run lint/typecheck separately.
  eslint: {
    ignoreDuringBuilds: !process.env.CI,
  },
  typescript: {
    ignoreBuildErrors: !process.env.CI,
  },
};

module.exports = withNextIntl(nextConfig);
