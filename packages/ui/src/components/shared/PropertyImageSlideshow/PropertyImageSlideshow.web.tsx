'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { PropertyImageSlideshowProps } from './PropertyImageSlideshow.types';
import { useSlideshowLogic } from './PropertyImageSlideshow.logic';
import { useSlideshowManager } from './SlideshowManagerContext';
import { PropertyImagePlaceholder } from '../../web/PropertyImagePlaceholder';

export function PropertyImageSlideshow({
  images,
  videoUrl,
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
  onVideoEnd,
  showGradient = false,
}: PropertyImageSlideshowProps) {
  const manager = useSlideshowManager();
  const [isActiveSlideshow, setIsActiveSlideshow] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const uniqueId = useRef(slideshowId || `slideshow-${Math.random().toString(36).substr(2, 9)}`);

  // Video state
  const [videoEnded, setVideoEnded] = useState(!videoUrl);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);

  // Track if we've completed for this activation
  const hasCompletedRef = useRef(false);

  // Show video if we have a URL and video hasn't ended
  const showVideo = videoUrl && !videoEnded;

  // Determine if the card is externally active
  const isCardActive = externalIsActive !== undefined
    ? externalIsActive
    : (!isSmallScreen || isActiveSlideshow);

  // Slideshow should only be active when video is done (or no video) AND card is active
  const isSlideshowActive = isCardActive && !showVideo;

  // Handle internal slideshow complete
  const handleInternalSlideshowComplete = useCallback(() => {
    if (!hasCompletedRef.current && isCardActive) {
      hasCompletedRef.current = true;
      onSlideshowComplete?.();
    }
  }, [isCardActive, onSlideshowComplete]);

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
    isActive: isSlideshowActive,
    onImageChange,
    onSlideshowComplete: handleInternalSlideshowComplete,
  });

  // Handle video end - transition to slideshow
  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
    setVideoProgress(100);
    onVideoEnd?.();

    // If no images or only one image, trigger completion after showing the image
    if (!hasMultipleImages) {
      setTimeout(() => {
        if (!hasCompletedRef.current && isCardActive) {
          hasCompletedRef.current = true;
          onSlideshowComplete?.();
        }
      }, duration);
    }
  }, [onVideoEnd, hasMultipleImages, duration, isCardActive, onSlideshowComplete]);

  // Handle video time update for progress bar
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current && videoRef.current.duration) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(progress);
    }
  }, []);

  // Toggle mute on video click
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // Reset and start video when card becomes active
  useEffect(() => {
    if (isCardActive && videoUrl) {
      // Reset video state
      setVideoEnded(false);
      setVideoProgress(0);
      setIsMuted(true);
      hasCompletedRef.current = false;

      // Start video playback
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {
          // Autoplay blocked - skip video
          setVideoEnded(true);
        });
      }
    } else if (isCardActive && !videoUrl) {
      // No video - reset completion flag for image slideshow
      hasCompletedRef.current = false;
    }
  }, [isCardActive, videoUrl]);

  // Pause video when card becomes inactive
  useEffect(() => {
    if (!isCardActive && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isCardActive]);

  // Reset video when videoUrl changes
  useEffect(() => {
    if (videoUrl) {
      setVideoEnded(false);
      setVideoProgress(0);
      setIsMuted(true);
    } else {
      setVideoEnded(true);
    }
  }, [videoUrl]);

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

  // Calculate total items for progress bar
  const totalItems = (videoUrl ? 1 : 0) + (images?.length || 0);
  const hasMultipleItems = totalItems > 1;

  return (
    <div ref={containerRef} className={containerClasses}>
      {/* Progress Bars - Video + Images */}
      {showProgressBars && hasMultipleItems && (
        <div
          className="absolute top-0 left-0 right-0 h-10 z-30 flex items-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1.5 w-full">
            {/* Video progress bar */}
            {videoUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setVideoEnded(false);
                  setVideoProgress(0);
                  hasCompletedRef.current = false;
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                  }
                }}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-100"
                  style={{ width: `${videoEnded ? 100 : videoProgress}%` }}
                />
              </button>
            )}
            {/* Image progress bars */}
            {images?.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showVideo) {
                    setVideoEnded(true);
                  }
                  hasCompletedRef.current = false;
                  handleImageChange(idx);
                }}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{
                    width: `${!showVideo ? getProgressWidth(idx) : 0}%`,
                    transition: idx === currentImageIndex && !showVideo ? 'none' : 'width 0.3s ease',
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Clickable Area */}
      {onClick && !showVideo && (
        <button
          onClick={onClick}
          className="absolute inset-0 top-10 z-5 cursor-pointer"
          aria-label="View property details"
        />
      )}

      {/* Video Player */}
      {showVideo && (
        <div className="relative w-full h-full" onClick={handleVideoClick}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover"
            autoPlay={isCardActive}
            muted={isMuted}
            playsInline
            loop={false}
            onEnded={handleVideoEnd}
            onTimeUpdate={handleVideoTimeUpdate}
          />
          {/* Mute/Unmute Glass Badge - Top Left (same height as score badge) */}
          <div
            className="absolute top-12 left-3 z-20 w-12 h-12 rounded-full flex items-center justify-center shadow-xl cursor-pointer"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Main Image - when video ended or no video */}
      {!showVideo && (
        <>
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
        </>
      )}

      {/* Gradient Overlay - only show when explicitly enabled and not during video */}
      {showGradient && !showVideo && (
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
