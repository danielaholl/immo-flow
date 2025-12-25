'use client';

import { ReactNode } from 'react';
import { PageContainer } from '../../PageContainer';

export interface MasterDetailLayoutProps {
  /** Content for the left list column */
  masterContent: ReactNode;
  /** Header content for mobile view (shown above list) */
  mobileHeader?: ReactNode;
  /** Header content for desktop view (inside list column) */
  desktopHeader?: ReactNode;
  /** Empty state when no items */
  emptyState?: ReactNode;
  /** Content for the right detail column */
  detailContent: ReactNode;
  /** Whether detail view is active (for mobile toggle) */
  showDetail: boolean;
  /** Whether there are any items in the list */
  hasItems: boolean;
  /** Custom class name for container */
  className?: string;
  /** Height of the container (default: calc(100vh - 100px)) */
  height?: string;
}

/**
 * Master-Detail Layout Component
 *
 * Responsive layout with:
 * - Mobile: Shows either list OR detail (toggled via showDetail)
 * - Desktop: Shows list on left (fixed width) and detail on right (flex)
 */
export function MasterDetailLayout({
  masterContent,
  mobileHeader,
  desktopHeader,
  emptyState,
  detailContent,
  showDetail,
  hasItems,
  className = '',
  height = 'calc(100vh - 100px)',
}: MasterDetailLayoutProps) {
  // Show empty state if no items
  if (!hasItems && emptyState) {
    return (
      <PageContainer className="py-12">
        {emptyState}
      </PageContainer>
    );
  }

  return (
    <>
      {/* Mobile Header - visible only on small screens when no detail is shown */}
      {mobileHeader && (
        <PageContainer
          noPaddingY
          className={`${showDetail ? 'hidden' : 'block'} lg:hidden bg-white border-b border-gray-200 py-4`}
        >
          {mobileHeader}
        </PageContainer>
      )}

      <PageContainer noPaddingX noPaddingY height={height} className={className}>
        <div className="flex flex-col lg:flex-row overflow-hidden h-full">
          {/* Left Column - Master List */}
          <div
            className={`${showDetail ? 'hidden' : 'block'} w-full lg:block lg:w-[380px] lg:min-w-[20%] lg:flex-shrink-0 lg:border-r lg:border-gray-200 overflow-y-auto`}
          >
            <div className="p-4">
              {/* Desktop Header - Hidden on mobile */}
              {desktopHeader && (
                <div className="hidden lg:block">
                  {desktopHeader}
                </div>
              )}
              {masterContent}
            </div>
          </div>

          {/* Right Column - Detail View */}
          <div
            className={`${showDetail ? 'flex' : 'hidden'} lg:flex lg:flex-1 flex-col h-[calc(100vh-100px)] overflow-hidden`}
          >
            {detailContent}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
