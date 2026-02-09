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
};

module.exports = withNextIntl(nextConfig);
