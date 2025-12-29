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

// Apple Glass variant classes with light mode border support
const variantClasses: Record<GlassButtonVariant, string> = {
  default: 'bg-gray-100/60 dark:bg-white/10 hover:bg-gray-200/70 dark:hover:bg-white/20 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-200',
  primary: 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-200/50 dark:border-white/30 text-blue-600 dark:text-blue-400',
  success: 'bg-green-500/20 hover:bg-green-500/30 border-green-200/50 dark:border-white/30 text-green-600 dark:text-green-400',
  danger: 'bg-red-500/10 hover:bg-red-500/20 border-red-200/50 dark:border-red-500/30 text-red-600 dark:text-red-400',
  warning: 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-200/50 dark:border-white/30 text-amber-600 dark:text-amber-400',
  favorite: 'bg-[#FF385C]/20 hover:bg-[#FF385C]/30 border-red-200/50 dark:border-white/30 text-[#FF385C]',
};

// Base classes for all buttons
const baseClasses = 'backdrop-blur-xl border font-medium rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-95 disabled:hover:scale-100';

// Size-specific classes
const sizeClasses: Record<GlassButtonSize, { button: string; iconSize: number; iconOnlySize: string }> = {
  sm: { button: 'py-2 px-3 text-xs min-h-[32px]', iconSize: 14, iconOnlySize: 'w-10 h-10' },
  md: { button: 'py-3 px-4 text-sm min-h-[40px]', iconSize: 16, iconOnlySize: 'w-12 h-12' },
  lg: { button: 'py-4 px-5 text-sm min-h-[48px]', iconSize: 18, iconOnlySize: 'w-14 h-14' },
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
  const isDisabled = disabled || loading;
  const sizeConfig = sizeClasses[size];
  const iconSize = sizeConfig.iconSize;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  // Clone icons with proper size (preserve existing className for custom colors!)
  const renderIcon = (icon: React.ReactNode) => {
    if (!icon) return null;
    if (React.isValidElement(icon)) {
      const existingClassName = (icon.props as { className?: string })?.className || '';
      return React.cloneElement(icon as React.ReactElement<{ size?: number; className?: string }>, {
        size: iconSize,
        className: `flex-shrink-0 ${existingClassName}`.trim(),
      });
    }
    return icon;
  };

  // Build button classes
  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${iconOnly ? `${sizeConfig.iconOnlySize} rounded-full p-0` : sizeConfig.button}
    ${fullWidth ? 'w-full' : ''}
    ${subtleBorder ? '!border-white/50' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const buttonContent = (
    <>
      {loading ? (
        <svg
          className="animate-spin flex-shrink-0"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
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
          {children && !iconOnly && <span>{children}</span>}
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
        className={buttonClasses}
      >
        {buttonContent}
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg
                     text-xs font-medium text-white whitespace-nowrap
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50
                     bg-gray-900/85 backdrop-blur-md"
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
