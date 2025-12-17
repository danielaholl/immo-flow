'use client';

import { ReactNode } from 'react';
import { PropertyImageSlideshow } from '../../PropertyImageSlideshow';
import { MobileDetailHeader } from '../../MobileDetailHeader';

export interface PropertyDetailLayoutProps {
  /** Property images for slideshow */
  images: string[];
  /** Optional video URL */
  videoUrl?: string;
  /** Property title for slideshow */
  propertyTitle: string;
  /** Property ID for slideshow */
  propertyId: string;
  /** Property type for slideshow */
  propertyType?: string;
  /** Main scrollable content */
  children: ReactNode;
  /** Action buttons for desktop (fixed at bottom with blur) */
  desktopActionButtons?: ReactNode;
  /** Action buttons for mobile (scrolls with content) */
  mobileActionButtons?: ReactNode;
  /** Callback when back button is pressed (mobile) */
  onBack: () => void;
  /** Back button title */
  backTitle?: string;
  /** Whether to show the mobile header */
  showMobileHeader?: boolean;
}

/**
 * Property Detail Layout Component
 *
 * 50/50 split layout for property views:
 * - Mobile: Images at top scrolling with content, buttons at end
 * - Desktop: Images sticky right, content scrollable left, buttons fixed with gradient blur
 */
export function PropertyDetailLayout({
  images,
  videoUrl,
  propertyTitle,
  propertyId,
  propertyType,
  children,
  desktopActionButtons,
  mobileActionButtons,
  onBack,
  backTitle = 'Zurück',
  showMobileHeader = true,
}: PropertyDetailLayoutProps) {
  return (
    <>
      {/* Mobile Detail Header - Only shown on mobile */}
      {showMobileHeader && (
        <MobileDetailHeader
          title={backTitle}
          subtitle=""
          onBack={onBack}
        />
      )}

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Left - Property Details (Scrollable) */}
        <div className="w-full lg:w-1/2 flex flex-col flex-1 min-h-0">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-4">
            {/* Mobile: Image Slideshow at top */}
            <div className="lg:hidden mb-4">
              <div className="h-[50vh]">
                <PropertyImageSlideshow
                  images={images}
                  videoUrl={videoUrl}
                  title={propertyTitle}
                  className="h-full"
                  showCounter={true}
                  showProgressBars={true}
                  slideshowId={`detail-mobile-${propertyId}`}
                  propertyType={propertyType}
                />
              </div>
            </div>

            {/* Main Content */}
            {children}

            {/* Mobile: Action Buttons - scrolls with content */}
            {mobileActionButtons && (
              <div className="lg:hidden mt-6 bg-white">
                {mobileActionButtons}
              </div>
            )}
          </div>

          {/* Desktop: Action Buttons - Fixed at bottom with gradient blur */}
          {desktopActionButtons && (
            <div className="hidden lg:block flex-shrink-0 bg-gradient-to-t from-white to-transparent backdrop-blur-[2px] p-4">
              {desktopActionButtons}
            </div>
          )}
        </div>

        {/* Right - Image Slideshow (Desktop only) */}
        <div className="hidden lg:block lg:w-1/2 lg:sticky lg:top-0 lg:h-[calc(100vh-100px)] p-6">
          <PropertyImageSlideshow
            images={images}
            videoUrl={videoUrl}
            title={propertyTitle}
            className="h-full"
            showCounter={true}
            showProgressBars={true}
            slideshowId={`detail-desktop-${propertyId}`}
            propertyType={propertyType}
          />
        </div>
      </div>
    </>
  );
}
