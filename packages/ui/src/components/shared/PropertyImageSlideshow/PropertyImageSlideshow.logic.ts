'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSlideshowLogicProps {
  images: string[] | null | undefined;
  duration: number;
  isActive?: boolean;
  onImageChange?: (index: number) => void;
  onSlideshowComplete?: () => void;
}

export function useSlideshowLogic({
  images,
  duration,
  isActive = true,
  onImageChange,
  onSlideshowComplete,
}: UseSlideshowLogicProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const hasImages = images && images.length > 0;
  const hasMultipleImages = images && images.length > 1;
  const shouldAnimate = hasMultipleImages && isActive && !hasReachedEnd;

  // Track if we should call onSlideshowComplete
  const shouldCompleteRef = useRef(false);

  // Animated slideshow with progress bar
  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const newProgress = Math.min((elapsed / duration) * 100, 100);
    setProgress(newProgress);

    if (elapsed >= duration) {
      const imageCount = images?.length || 1;

      setCurrentImageIndex((prev) => {
        const isLastImage = prev >= imageCount - 1;

        if (isLastImage) {
          setHasReachedEnd(true);
          shouldCompleteRef.current = true;
          return prev;
        }

        const newIndex = prev + 1;
        onImageChange?.(newIndex);
        return newIndex;
      });

      startTimeRef.current = timestamp;
      if (!shouldCompleteRef.current) {
        setProgress(0);
      }
    }

    // Only continue animation if not at the end
    if (!hasReachedEnd && !shouldCompleteRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [images?.length, duration, onImageChange, hasReachedEnd]);

  // Handle completion callback separately to avoid setState during render
  useEffect(() => {
    if (shouldCompleteRef.current) {
      shouldCompleteRef.current = false;
      setProgress(100);
      onSlideshowComplete?.();
    }
  }, [hasReachedEnd, onSlideshowComplete]);

  useEffect(() => {
    if (!shouldAnimate) {
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

  // Reset when becoming active
  useEffect(() => {
    if (isActive) {
      setCurrentImageIndex(0);
      setProgress(0);
      setHasReachedEnd(false);
      startTimeRef.current = 0;
    }
  }, [isActive]);

  // Handle manual image change
  const handleImageChange = useCallback((newIndex: number) => {
    setCurrentImageIndex(newIndex);
    startTimeRef.current = 0;
    setProgress(0);
    if (newIndex < (images?.length || 1) - 1) {
      setHasReachedEnd(false);
    }
    onImageChange?.(newIndex);
  }, [onImageChange, images?.length]);

  // Get progress width for a specific index
  const getProgressWidth = useCallback((idx: number): number => {
    if (idx < currentImageIndex) return 100;
    if (idx === currentImageIndex) return progress;
    return 0;
  }, [currentImageIndex, progress]);

  return {
    currentImageIndex,
    progress,
    imageError,
    setImageError,
    hasImages,
    hasMultipleImages,
    handleImageChange,
    getProgressWidth,
  };
}
