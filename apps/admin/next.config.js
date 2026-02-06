/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@fis-learn/ui', '@fis-learn/types', '@fis-learn/utils'],
};

module.exports = nextConfig;
