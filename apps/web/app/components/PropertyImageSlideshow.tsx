'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PropertyImagePlaceholder } from '@immoflow/ui';
import { useSlideshowManager } from './SlideshowManagerContext';

interface PropertyImageSlideshowProps {
  images: string[] | null | undefined;
  title: string;
  duration?: number; // Duration per image in ms
  showCounter?: boolean;
  showProgressBars?: boolean;
  className?: string;
  imageClassName?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  rounded?: 'none' | 'lg' | 'xl' | '2xl' | 'full';
  overlay?: React.ReactNode;
  onImageChange?: (index: number) => void;
  onClick?: () => void; // Click handler for main content area (excluding progress bars and overlay)
  slideshowId?: string; // Unique ID for tracking visibility (required for small screen optimization)
}

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
}: PropertyImageSlideshowProps) {
  const manager = useSlideshowManager();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isActiveSlideshow, setIsActiveSlideshow] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const uniqueId = useRef(slideshowId || `slideshow-${Math.random().toString(36).substr(2, 9)}`);

  const hasImages = images && images.length > 0;
  const hasMultipleImages = images && images.length > 1;

  // Check if we're on a small screen
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 1024); // lg breakpoint
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Set up intersection observer for small screens
  useEffect(() => {
    if (!isSmallScreen || !containerRef.current) {
      // On large screens, always active
      setIsActiveSlideshow(true);
      return;
    }

    const id = uniqueId.current;

    // Register callback with context manager
    manager.registerSlideshow(id, setIsActiveSlideshow);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Calculate visibility ratio and update via context manager
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
  }, [isSmallScreen, manager]);

  // Determine if slideshow should be running
  const shouldAnimate = hasMultipleImages && (!isSmallScreen || isActiveSlideshow) && !hasReachedEnd;

  // Animated slideshow with progress bar
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);
    setProgress(newProgress);

    if (elapsed >= duration) {
      // Move to next image
      setCurrentImageIndex((prev) => {
        const isLastImage = prev >= (images?.length || 1) - 1;

        // Stop at last image instead of looping back to 0
        if (isLastImage) {
          setProgress(100); // Set progress to 100% on last image
          setHasReachedEnd(true); // Mark slideshow as ended
          return prev; // Stay on last image
        }

        const newIndex = prev + 1;
        onImageChange?.(newIndex);
        return newIndex;
      });
      startTimeRef.current = timestamp;
      setProgress(0);
    }

    // Only continue animation if not at the end
    if (!hasReachedEnd) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [images?.length, duration, onImageChange, hasReachedEnd]);

  useEffect(() => {
    if (!shouldAnimate) {
      // Cancel any existing animation when paused
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    startTimeRef.current = 0;
    setProgress(0);
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [shouldAnimate, animate]);

  // Reset progress when manually changing image
  const handleImageChange = useCallback((newIndex: number) => {
    setCurrentImageIndex(newIndex);
    startTimeRef.current = 0;
    setProgress(0);
    // Reset hasReachedEnd if user manually goes back to an earlier image
    if (newIndex < (images?.length || 1) - 1) {
      setHasReachedEnd(false);
    }
    onImageChange?.(newIndex);
  }, [onImageChange, images?.length]);

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

  return (
    <div ref={containerRef} className={`relative overflow-hidden bg-gray-900 ${roundedClass} ${aspectRatioClass} ${className}`}>
      {/* Progress Bars Area - Top 40px for clicking on progress bars */}
      {showProgressBars && hasMultipleImages && (
        <div
          className="absolute top-0 left-0 right-0 h-10 z-30 flex items-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5 w-full">
            {images.map((_, idx) => (
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
                    width: idx < currentImageIndex
                      ? '100%'
                      : idx === currentImageIndex
                        ? `${progress}%`
                        : '0%',
                    transition: idx === currentImageIndex ? 'none' : 'width 0.3s ease',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Clickable Area - Below progress bars, excluding overlay area */}
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
          src={images[currentImageIndex] || images[0]}
          alt={title}
          className={`w-full h-full object-cover ${imageClassName}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <PropertyImagePlaceholder className="w-full h-full" iconSize={250} />
      )}

      {/* Gradient Overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)'
        }}
      />

      {/* Custom Overlay - Has its own click handlers via pointer-events */}
      <div className="contents" onClick={(e) => e.stopPropagation()}>
        {overlay}
      </div>

      {/* Image Counter */}
      {showCounter && hasMultipleImages && (
        <div className="absolute bottom-6 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full z-10 pointer-events-none">
          {currentImageIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
