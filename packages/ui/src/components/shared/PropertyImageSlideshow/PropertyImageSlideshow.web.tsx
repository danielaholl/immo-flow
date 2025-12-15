'use client';

import { useState, useEffect, useRef } from 'react';
import type { PropertyImageSlideshowProps } from './PropertyImageSlideshow.types';
import { useSlideshowLogic } from './PropertyImageSlideshow.logic';
import { useSlideshowManager } from './SlideshowManagerContext';
import { PropertyImagePlaceholder } from '../../web/PropertyImagePlaceholder';

export function PropertyImageSlideshow({
  images,
  title,
  duration = 3000,
  showCounter = true,
  showProgressBars = true,
  className = '',
  imageClassName = '',
  aspectRatio = 'auto',
  rounded = '2xl',
  overlay,
  onImageChange,
  onClick,
  slideshowId,
  propertyType,
  isActive: externalIsActive,
  onSlideshowComplete,
  showGradient = false,
}: PropertyImageSlideshowProps) {
  const manager = useSlideshowManager();
  const [isActiveSlideshow, setIsActiveSlideshow] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(slideshowId || `slideshow-${Math.random().toString(36).substr(2, 9)}`);

  // Determine if slideshow should be active
  const isActive = externalIsActive !== undefined
    ? externalIsActive
    : (!isSmallScreen || isActiveSlideshow);

  const {
    currentImageIndex,
    imageError,
    setImageError,
    hasImages,
    hasMultipleImages,
    handleImageChange,
    getProgressWidth,
  } = useSlideshowLogic({
    images,
    duration,
    isActive,
    onImageChange,
    onSlideshowComplete,
  });

  // Check if we're on a small screen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set up intersection observer for small screens
  useEffect(() => {
    if (!isSmallScreen || !containerRef.current || externalIsActive !== undefined) {
      setIsActiveSlideshow(true);
      return;
    }

    const id = uniqueId.current;
    manager.registerSlideshow(id, setIsActiveSlideshow);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const visibility = entry.intersectionRatio;
          manager.updateVisibility(id, visibility);
        });
      },
      {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      manager.unregisterSlideshow(id);
    };
  }, [isSmallScreen, manager, externalIsActive]);

  const aspectRatioClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: '',
  }[aspectRatio];

  const roundedClass = {
    none: '',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  const containerClasses = aspectRatio === 'auto'
    ? `relative overflow-hidden ${roundedClass} h-full ${className}`.replace('h-full h-full', 'h-full')
    : `relative overflow-hidden ${roundedClass} ${aspectRatioClass} ${className}`;

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Progress Bars */}
      {showProgressBars && hasMultipleImages && (
        <div
          className="absolute top-0 left-0 right-0 h-10 z-30 flex items-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5 w-full">
            {images!.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageChange(idx);
                }}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${getProgressWidth(idx)}%`,
                    transition: idx === currentImageIndex ? 'none' : 'width 0.3s ease',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Clickable Area */}
      {onClick && (
        <button
          onClick={onClick}
          className="absolute inset-0 top-10 z-5 cursor-pointer"
          aria-label="View property details"
        />
      )}

      {/* Main Image */}
      {hasImages && !imageError ? (
        <img
          src={images![currentImageIndex] || images![0]}
          alt={title}
          className={`w-full h-full object-cover ${imageClassName}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <PropertyImagePlaceholder className="w-full h-full" propertyType={propertyType} />
      )}

      {/* Gradient Overlay - only show when explicitly enabled */}
      {showGradient && (
        <div
          className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
          }}
        />
      )}

      {/* Custom Overlay */}
      <div className="contents" onClick={(e) => e.stopPropagation()}>
        {overlay}
      </div>
    </div>
  );
}
