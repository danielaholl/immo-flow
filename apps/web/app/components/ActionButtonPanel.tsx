'use client';

import { ReactNode } from 'react';

interface ActionButtonPanelProps {
  /** Button content for all screen sizes (used if mobile/desktop not specified) */
  children?: ReactNode;
  /** Button content for mobile only */
  mobileContent?: ReactNode;
  /** Button content for desktop only */
  desktopContent?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Layout mode: 'sidebar' for MasterDetailLayout, 'split' for 50/50 layouts */
  layout?: 'sidebar' | 'split';
}

/**
 * ActionButtonPanel - Reusable glass panel for action buttons
 *
 * - Mobile: Fixed at bottom, full width
 * - Desktop (lg+): Fixed at bottom, positioned based on layout mode
 * - 'sidebar' layout: Uses CSS variable --sidebar-width from MasterDetailLayout
 * - 'split' layout: Uses left half of screen for 50/50 layouts
 */
export function ActionButtonPanel({
  children,
  mobileContent,
  desktopContent,
  className = '',
  layout = 'sidebar'
}: ActionButtonPanelProps) {
  // Use specific content if provided, otherwise fall back to children
  const mobile = mobileContent ?? children;
  const desktop = desktopContent ?? children;

  // Desktop positioning based on layout mode
  // Note: PageContainer uses max-w-[1800px] mx-auto, so we need to account for centering margin
  const containerMargin = 'max(0px, (100vw - 1800px) / 2)';

  const desktopStyle = layout === 'split'
    ? {
        // 50/50 split layout: left half of PageContainer
        // Left: PageContainer margin
        // Right: PageContainer margin + 50% of container width
        left: `calc(${containerMargin})`,
        right: `calc(${containerMargin} + min(1800px, 100vw) / 2)`
      }
    : {
        // Sidebar layout (MasterDetailLayout): flush with PropertyPreview container
        // Left: PageContainer margin + sidebar width (at vertical divider line)
        // Right: PageContainer margin + half of detail area width
        left: `calc(${containerMargin} + var(--sidebar-width, 420px))`,
        right: `calc(${containerMargin} + (min(1800px, 100vw) - var(--sidebar-width, 420px)) / 2)`
      };

  return (
    <>
      {/* Mobile: Fixed at bottom, full width */}
      {mobile && (
        <div className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 p-4
                        bg-white/40 dark:bg-gray-900/40 backdrop-blur-[4px]
                        border-t border-gray-200/50 dark:border-gray-700/50 ${className}`}>
          {mobile}
        </div>
      )}

      {/* Desktop: Fixed at bottom, positioned based on layout mode */}
      {desktop && (
        <div
          className={`hidden lg:block fixed bottom-0 z-30 p-4
                     bg-white/40 dark:bg-gray-900/40 backdrop-blur-[4px]
                     border-t border-gray-200/50 dark:border-gray-700/50
                     transition-all duration-300 ease-in-out ${className}`}
          style={desktopStyle}
        >
          {desktop}
        </div>
      )}
    </>
  );
}
