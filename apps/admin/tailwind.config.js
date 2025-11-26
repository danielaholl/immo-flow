/** @type {import('tailwindcss').Config} */
const sharedConfig = require('@immoflow/tailwind-config');

module.exports = {
  ...sharedConfig,
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
};
