/**
 * Color system for ImmoFlow
 * Consistent colors across all platforms (iOS, Android, Web)
 */

export const colors = {
  // Primary brand colors
  primary: '#FF385C',
  primaryDark: '#E31C5F',
  primaryLight: '#FF5A7D',

  // Secondary colors
  secondary: '#222222',
  secondaryLight: '#484848',

  // Surface colors
  surface: '#FFFFFF',
  surfaceVariant: '#FFFFFF',
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
  border: '#DDDDDD',
  borderLight: '#EBEBEB',
  borderDark: '#B0B0B0',

  // Semantic colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // AI Score colors (traffic light system)
  scoreExcellent: '#10B981', // Green - 85+
  scoreGood: '#F59E0B', // Yellow - 70-84
  scorePoor: '#EF4444', // Red - below 70

  // Accent colors (from placeholder_house.png inspiration)
  accent: {
    // Pool water - refreshing, clean, trust
    aqua: '#7DD3E8',
    aquaLight: '#B5E8F0',
    aqua50: '#E8F9FC',
    // Warm white - soft backgrounds
    cream: '#FFFFFF',
    creamDark: '#FFFFFF',
    // Sky blue - calm, professional
    sky: '#E8F4F8',
    // Cherry blossom - soft highlights
    blush: '#FFFFFF',
    blushDark: '#FFFFFF',
  },

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  // Transparent
  transparent: 'transparent',
} as const;

export type Colors = typeof colors;
