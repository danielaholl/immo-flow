'use client';

import React from 'react';
import { formatCount } from '../../utils/formatCount';

export type ImageOverlayButtonVariant = 'default' | 'danger' | 'success' | 'warning' | 'primary' | 'favorite';
export type ImageOverlayButtonSize = 'sm' | 'md' | 'lg' | 'responsive';

export interface ImageOverlayButtonProps {
  /** Button variant determines border and icon color */
  variant?: ImageOverlayButtonVariant;
  /** Button size */
  size?: ImageOverlayButtonSize;
  /** Icon to display */
  icon: React.ReactNode;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Accessibility label */
  ariaLabel?: string;
  /** Counter value to display below the icon */
  count?: number;
  /** Whether to show the counter (default: true) */
  showCount?: boolean;
}

// Variant colors for border and icons
const variantConfig: Record<ImageOverlayButtonVariant, { color: string; hoverBg: string }> = {
  default: {
    color: 'rgba(255, 255, 255, 1)',
    hoverBg: 'rgba(255, 255, 255, 0.1)',
  },
  danger: {
    color: 'rgba(239, 68, 68, 1)',
    hoverBg: 'rgba(239, 68, 68, 0.15)',
  },
  success: {
    color: 'rgba(34, 197, 94, 1)',
    hoverBg: 'rgba(34, 197, 94, 0.15)',
  },
  warning: {
    color: 'rgba(245, 158, 11, 1)',
    hoverBg: 'rgba(245, 158, 11, 0.15)',
  },
  primary: {
    color: 'rgba(59, 130, 246, 1)',
    hoverBg: 'rgba(59, 130, 246, 0.15)',
  },
  favorite: {
    color: '#FF385C',
    hoverBg: 'rgba(255, 56, 92, 0.15)',
  },
};

// Size configuration for fixed sizes
const sizeConfig: Record<Exclude<ImageOverlayButtonSize, 'responsive'>, { size: number; iconSize: number }> = {
  sm: { size: 44, iconSize: 20 },
  md: { size: 52, iconSize: 24 },
  lg: { size: 68, iconSize: 32 },
};

// Responsive size uses CSS clamp for fluid scaling
const responsiveSizeConfig = {
  // Min 44px, scales with container (8% of container width), max 68px
  size: 'clamp(44px, 8vw, 68px)',
  iconSize: 'clamp(20px, 3.5vw, 32px)',
};

export function ImageOverlayButton({
  variant = 'default',
  size = 'md',
  icon,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  tooltip,
  ariaLabel,
  count,
  showCount = true,
}: ImageOverlayButtonProps) {
  const { color, hoverBg } = variantConfig[variant];
  const isResponsive = size === 'responsive';
  const sizeStyles = isResponsive ? null : sizeConfig[size];
  const isDisabled = disabled || loading;

  // Format count for display
  const formattedCount = formatCount(count);
  const hasCount = showCount && formattedCount !== '';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  // Clone icon with proper size and color
  const renderIcon = () => {
    const iconSize = isResponsive ? 24 : sizeStyles!.iconSize; // Default for responsive, CSS handles actual size

    if (loading) {
      return (
        <svg
          className="animate-spin"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          style={{
            color,
            ...(isResponsive && { width: responsiveSizeConfig.iconSize, height: responsiveSizeConfig.iconSize }),
          }}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }

    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<{ size?: number; color?: string; style?: React.CSSProperties }>, {
        size: iconSize,
        color: color,
        style: {
          flexShrink: 0,
          ...(isResponsive && { width: responsiveSizeConfig.iconSize, height: responsiveSizeConfig.iconSize }),
        },
      });
    }
    return icon;
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      {/* Icon Button */}
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={ariaLabel}
        className="relative flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        style={{
          width: isResponsive ? responsiveSizeConfig.size : sizeStyles!.size,
          height: isResponsive ? responsiveSizeConfig.size : sizeStyles!.size,
          background: 'transparent',
          border: 'none',
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.filter = 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4))';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))';
        }}
      >
        <div className="relative inline-flex items-center justify-center">
          {renderIcon()}

          {/* Counter Label - absolutely positioned 2px below icon */}
          {hasCount && (
            <span
              className="absolute font-semibold text-white pointer-events-none select-none"
              style={{
                fontSize: isResponsive ? 'clamp(0.6rem, 2vw, 0.75rem)' : '0.75rem',
                textShadow: '0 1px 3px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)',
                letterSpacing: '0.01em',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginTop: '2px',
              }}
            >
              {formattedCount}
            </span>
          )}
        </div>
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
