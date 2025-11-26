/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@immoflow/ui',
    '@immoflow/database',
    '@immoflow/api',
    '@immoflow/utils',
    'react-native',
    'react-native-web',
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    config.resolve.extensions = [
      '.web.js',
      '.web.jsx',
      '.web.ts',
      '.web.tsx',
      ...config.resolve.extensions,
    ];
    return config;
  },
  images: {
    domains: ['via.placeholder.com'], // Add your image domains here
  },
};

module.exports = nextConfig;
