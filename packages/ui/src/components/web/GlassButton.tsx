'use client';

import React from 'react';

export type GlassButtonVariant = 'default' | 'danger' | 'success' | 'warning' | 'primary' | 'favorite';
export type GlassButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  /** Button variant determines border and text color */
  variant?: GlassButtonVariant;
  /** Button size */
  size?: GlassButtonSize;
  /** Button label text */
  children?: React.ReactNode;
  /** Icon to display on the left */
  iconLeft?: React.ReactNode;
  /** Icon to display on the right */
  iconRight?: React.ReactNode;
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
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Full width button */
  fullWidth?: boolean;
  /** Icon only mode (no text, circular button) */
  iconOnly?: boolean;
  /** Use subtle border (white with low opacity) instead of colored border */
  subtleBorder?: boolean;
}

const variantConfig: Record<GlassButtonVariant, { color: string; hoverBg: string }> = {
  default: {
    color: 'rgba(255, 255, 255, 1)',
    hoverBg: 'rgba(255, 255, 255, 0.1)',
  },
  danger: {
    color: 'rgba(239, 68, 68, 1)', // red-500
    hoverBg: 'rgba(239, 68, 68, 0.15)',
  },
  success: {
    color: 'rgba(34, 197, 94, 1)', // green-500
    hoverBg: 'rgba(34, 197, 94, 0.15)',
  },
  warning: {
    color: 'rgba(245, 158, 11, 1)', // amber-500
    hoverBg: 'rgba(245, 158, 11, 0.15)',
  },
  primary: {
    color: 'rgba(59, 130, 246, 1)', // blue-500
    hoverBg: 'rgba(59, 130, 246, 0.15)',
  },
  favorite: {
    color: '#FF385C', // coral accent
    hoverBg: 'rgba(255, 56, 92, 0.15)',
  },
};

const sizeConfig: Record<GlassButtonSize, {
  padding: string;
  paddingIconOnly: string;
  fontSize: string;
  fontWeight: string;
  iconSize: number;
  iconSizeIconOnly: number;
  gap: string;
  minHeight: string;
  sizeIconOnly: number;
}> = {
  sm: {
    padding: '6px 12px',
    paddingIconOnly: '12px',
    fontSize: '13px',
    fontWeight: '600',
    iconSize: 14,
    iconSizeIconOnly: 20,
    gap: '6px',
    minHeight: '32px',
    sizeIconOnly: 44,
  },
  md: {
    padding: '10px 16px',
    paddingIconOnly: '14px',
    fontSize: '14px',
    fontWeight: '600',
    iconSize: 16,
    iconSizeIconOnly: 24,
    gap: '8px',
    minHeight: '40px',
    sizeIconOnly: 52,
  },
  lg: {
    padding: '12px 20px',
    paddingIconOnly: '16px',
    fontSize: '15px',
    fontWeight: '700',
    iconSize: 18,
    iconSizeIconOnly: 28,
    gap: '10px',
    minHeight: '48px',
    sizeIconOnly: 60,
  },
};

export function GlassButton({
  variant = 'default',
  size = 'md',
  children,
  iconLeft,
  iconRight,
  onClick,
  disabled = false,
  loading = false,
  className = '',
  tooltip,
  ariaLabel,
  type = 'button',
  fullWidth = false,
  iconOnly = false,
  subtleBorder = false,
}: GlassButtonProps) {
  const { color, hoverBg } = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  const isDisabled = disabled || loading;
  const currentIconSize = iconOnly ? sizeStyles.iconSizeIconOnly : sizeStyles.iconSize;
  const borderColor = subtleBorder ? 'rgba(255, 255, 255, 0.5)' : color;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  // Clone icons with proper size and color
  const renderIcon = (icon: React.ReactNode) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      return React.cloneElement(icon as React.ReactElement<{ size?: number; color?: string; style?: React.CSSProperties }>, {
        size: currentIconSize,
        color: color,
        style: { flexShrink: 0 },
      });
    }
    return icon;
  };

  const buttonContent = (
    <>
      {loading ? (
        <svg
          className="animate-spin"
          width={currentIconSize}
          height={currentIconSize}
          viewBox="0 0 24 24"
          fill="none"
          style={{ color }}
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
      ) : (
        <>
          {renderIcon(iconLeft)}
          {children && !iconOnly && (
            <span style={{ color, fontSize: sizeStyles.fontSize, fontWeight: sizeStyles.fontWeight }}>
              {children}
            </span>
          )}
          {renderIcon(iconRight)}
        </>
      )}
    </>
  );

  return (
    <div className={`relative group ${fullWidth ? 'w-full' : 'inline-block'}`}>
      <button
        type={type}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        className={`
          flex items-center justify-center
          cursor-pointer
          transition-all duration-200
          hover:scale-[1.02] active:scale-95
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          ${iconOnly ? 'rounded-full' : 'rounded-full'}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        style={{
          ...(iconOnly
            ? { width: sizeStyles.sizeIconOnly, height: sizeStyles.sizeIconOnly }
            : { padding: sizeStyles.padding, minHeight: sizeStyles.minHeight }
          ),
          gap: sizeStyles.gap,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: `1px solid ${borderColor}`,
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.background = hoverBg;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {buttonContent}
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg
                     text-xs font-medium text-white whitespace-nowrap
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50"
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

// Pre-configured variants for common use cases
export function GlassDeleteButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="danger" {...props} />;
}

export function GlassSuccessButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="success" {...props} />;
}

export function GlassWarningButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="warning" {...props} />;
}

export function GlassPrimaryButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="primary" {...props} />;
}

export function GlassFavoriteButton(props: Omit<GlassButtonProps, 'variant'>) {
  return <GlassButton variant="favorite" {...props} />;
}
