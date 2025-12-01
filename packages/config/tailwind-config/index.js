/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        primary: {
          DEFAULT: '#FF385C',
          dark: '#E31C5F',
          light: '#FF5A7D',
        },
        // Secondary colors
        secondary: {
          DEFAULT: '#222222',
          light: '#484848',
        },
        // Surface colors
        surface: {
          DEFAULT: '#FFFFFF',
          variant: '#F7F7F7',
        },
        background: '#F7F7F7',
        // Text colors
        text: {
          primary: '#222222',
          secondary: '#717171',
          tertiary: '#B0B0B0',
          inverse: '#FFFFFF',
          disabled: '#DDDDDD',
        },
        // Border colors
        border: {
          DEFAULT: '#DDDDDD',
          light: '#EBEBEB',
          dark: '#B0B0B0',
        },
        // Semantic colors
        success: {
          DEFAULT: '#10B981',
          light: '#D1FAE5',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        error: {
          DEFAULT: '#EF4444',
          light: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#DBEAFE',
        },
        // AI Score colors (traffic light system)
        score: {
          excellent: '#10B981', // Green - 85+
          good: '#F59E0B',      // Yellow - 70-84
          poor: '#EF4444',      // Red - below 70
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',      // 12px
        'sm': '0.875rem',     // 14px
        'base': '1rem',       // 16px
        'lg': '1.125rem',     // 18px
        'xl': '1.25rem',      // 20px
        '2xl': '1.5rem',      // 24px
        '3xl': '1.875rem',    // 30px
        '4xl': '2.25rem',     // 36px
        '5xl': '3rem',        // 48px
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};
