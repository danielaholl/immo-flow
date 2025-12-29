/** @type {import('tailwindcss').Config} */
const sharedConfig = require('@rendito/tailwind-config');

module.exports = {
  ...sharedConfig,
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};
