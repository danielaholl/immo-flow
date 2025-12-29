/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
          variant: '#FFFFFF',
        },
        background: '#FFFFFF',
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
        // Accent colors (from placeholder_house.png inspiration)
        accent: {
          // Pool water - refreshing, clean, trust
          aqua: {
            DEFAULT: '#7DD3E8',
            light: '#B5E8F0',
            50: '#E8F9FC',
          },
          // Warm white - soft backgrounds
          cream: {
            DEFAULT: '#FFFFFF',
            dark: '#FFFFFF',
          },
          // Sky blue - calm, professional
          sky: {
            DEFAULT: '#E8F4F8',
          },
          // Cherry blossom - soft highlights
          blush: {
            DEFAULT: '#FFFFFF',
            dark: '#FFFFFF',
          },
        },
      },
      // Premium shadows with glow effects
      boxShadow: {
        'glow': '0 0 24px rgba(255, 56, 92, 0.3)',
        'glow-aqua': '0 0 24px rgba(125, 211, 232, 0.3)',
        'soft': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'mobile-xs': '0.75rem',   // 12px - mobile menu small
        'mobile-sm': '0.875rem',  // 14px - mobile menu
        'mobile-base': '1rem',    // 16px - mobile body
        'xs': '1rem',         // 16px
        'sm': '1.125rem',     // 18px
        'base': '1.25rem',    // 20px
        'lg': '1.375rem',     // 22px
        'xl': '1.5rem',       // 24px
        '2xl': '1.75rem',     // 28px
        '3xl': '2rem',        // 32px
        '4xl': '2.5rem',      // 40px
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
