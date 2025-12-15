'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Remove vertical padding */
  noPaddingY?: boolean;
  /** Remove horizontal padding */
  noPaddingX?: boolean;
  /** Custom height style (e.g., 'calc(100vh - 80px)') */
  height?: string;
}

/**
 * PageContainer - Wiederverwendbare Container-Komponente
 *
 * Stellt konsistente Abstände sicher, die bündig mit dem Header sind.
 * Verwendet die gleichen Klassen wie der Header: container mx-auto px-4
 */
export function PageContainer({
  children,
  className = '',
  noPaddingY = false,
  noPaddingX = false,
  height,
}: PageContainerProps) {
  return (
    <div
      className={`max-w-[1800px] mx-auto ${noPaddingX ? '' : 'px-4 lg:px-6'} ${noPaddingY ? '' : 'py-4 lg:py-6'} ${className}`}
      style={height ? { height } : undefined}
    >
      {children}
    </div>
  );
}
