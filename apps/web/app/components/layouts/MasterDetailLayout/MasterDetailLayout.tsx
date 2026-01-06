'use client';

import { ReactNode, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer } from '../../PageContainer';

export interface MasterDetailLayoutProps {
  /** Content for the left list column */
  masterContent: ReactNode;
  /** Content shown when sidebar is collapsed (e.g., small thumbnails) */
  collapsedContent?: ReactNode;
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
  /** Unique key for localStorage persistence of sidebar state (default: 'default') */
  storageKey?: string;
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
  collapsedContent,
  mobileHeader,
  desktopHeader,
  emptyState,
  detailContent,
  showDetail,
  hasItems,
  className = '',
  height = 'calc(100vh - 100px)',
  storageKey = 'default',
}: MasterDetailLayoutProps) {
  // Sidebar collapse state with localStorage persistence (per page)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const localStorageKey = `sidebar-collapsed-${storageKey}`;

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(localStorageKey);
    if (saved === 'true') {
      setSidebarCollapsed(true);
    }
  }, [localStorageKey]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(localStorageKey, String(sidebarCollapsed));
  }, [sidebarCollapsed, localStorageKey]);

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
          className={`${showDetail ? 'hidden' : 'block'} lg:hidden bg-white dark:bg-[#030712] border-b border-gray-200 dark:border-gray-800 py-4`}
        >
          {mobileHeader}
        </PageContainer>
      )}

      <PageContainer noPaddingX noPaddingY height={height} className={className}>
        <div
          className="flex flex-col lg:flex-row overflow-hidden h-full"
          style={{ '--sidebar-width': sidebarCollapsed ? '128px' : '420px' } as React.CSSProperties}
        >
          {/* Left Column - Master List */}
          <div
            className={`${showDetail ? 'hidden' : 'block'} w-full lg:block lg:flex-shrink-0 lg:border-r lg:border-gray-200 dark:lg:border-gray-800 overflow-y-auto relative transition-all duration-300 ease-in-out ${
              sidebarCollapsed ? 'lg:w-[128px]' : 'lg:w-[420px]'
            }`}
          >
            {/* Toggle Button - Desktop only, at top */}
            <div className="hidden lg:flex sticky top-0 z-20 bg-white dark:bg-[#030712] border-b border-gray-100 dark:border-gray-800 p-2 justify-end">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="w-8 h-8 flex items-center justify-center rounded-lg
                           bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                title={sidebarCollapsed ? 'Sidebar öffnen' : 'Sidebar schließen'}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </div>

            {/* Collapsed Content - Small thumbnails */}
            {sidebarCollapsed && collapsedContent && (
              <div className="hidden lg:block p-2 pr-8">
                {collapsedContent}
              </div>
            )}

            {/* Full Sidebar Content */}
            <div className={`p-4 lg:pr-8 transition-opacity duration-300 ${
              sidebarCollapsed ? 'lg:hidden' : ''
            }`}>
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
            className={`${showDetail ? 'flex' : 'hidden'} lg:flex lg:flex-1 flex-col h-[calc(100vh-100px)] overflow-y-auto lg:overflow-hidden`}
          >
            {detailContent}
          </div>
        </div>
      </PageContainer>
    </>
  );
}
