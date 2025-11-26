/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#FF385C',
        secondary: '#222222',
        surface: '#FFFFFF',
        background: '#F7F7F7',
        text: {
          primary: '#222222',
          secondary: '#717171',
          inverse: '#FFFFFF',
        },
        border: '#DDDDDD',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
};
