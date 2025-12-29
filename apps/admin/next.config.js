/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@rendito/database', '@rendito/api', '@rendito/utils'],
};

module.exports = nextConfig;
