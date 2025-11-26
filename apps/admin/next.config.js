/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@immoflow/database', '@immoflow/api', '@immoflow/utils'],
};

module.exports = nextConfig;
