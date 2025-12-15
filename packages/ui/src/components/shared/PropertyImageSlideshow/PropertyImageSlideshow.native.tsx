import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { Home } from 'lucide-react-native';
import type { PropertyImageSlideshowProps } from './PropertyImageSlideshow.types';
import { colors } from '../../../theme';

export function PropertyImageSlideshow({
  images,
  title,
  duration = 3000,
  showProgressBars = true,
  overlay,
  onImageChange,
  onClick,
  isActive = true,
  onSlideshowComplete,
  propertyType,
}: PropertyImageSlideshowProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progressWidths, setProgressWidths] = useState<number[]>(
    images?.map(() => 0) || []
  );
  const [imageError, setImageError] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  const hasImages = images && images.length > 0;
  const hasMultipleImages = images && images.length > 1;

  // Reset when becoming active
  useEffect(() => {
    if (isActive) {
      setCurrentImageIndex(0);
      setProgressWidths(images?.map(() => 0) || []);
    }
  }, [isActive, images?.length]);

  // Auto-slideshow animation
  useEffect(() => {
    if (!isActive || !hasMultipleImages) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setProgressWidths(prev => {
        const newWidths = [...prev];
        newWidths[currentImageIndex] = progress * 100;
        return newWidths;
      });

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Move to next image or complete
        if (currentImageIndex < (images?.length || 1) - 1) {
          setCurrentImageIndex(prev => prev + 1);
          onImageChange?.(currentImageIndex + 1);
        } else {
          onSlideshowComplete?.();
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, currentImageIndex, images?.length, duration, onImageChange, onSlideshowComplete, hasMultipleImages]);

  const handlePrevImage = useCallback((e: any) => {
    e.stopPropagation();
    if (currentImageIndex > 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setProgressWidths(prev => {
        const newWidths = [...prev];
        newWidths[currentImageIndex] = 0;
        return newWidths;
      });
      setCurrentImageIndex(prev => prev - 1);
      onImageChange?.(currentImageIndex - 1);
    }
  }, [currentImageIndex, onImageChange]);

  const handleNextImage = useCallback((e: any) => {
    e.stopPropagation();
    if (currentImageIndex < (images?.length || 1) - 1) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setProgressWidths(prev => {
        const newWidths = [...prev];
        newWidths[currentImageIndex] = 100;
        return newWidths;
      });
      setCurrentImageIndex(prev => prev + 1);
      onImageChange?.(currentImageIndex + 1);
    }
  }, [currentImageIndex, images?.length, onImageChange]);

  const handleProgressBarClick = useCallback((e: any, idx: number) => {
    e.stopPropagation();
    if (idx === currentImageIndex) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setProgressWidths(prev => {
      const newWidths = [...prev];
      for (let i = 0; i < newWidths.length; i++) {
        if (i < idx) {
          newWidths[i] = 100;
        } else {
          newWidths[i] = 0;
        }
      }
      return newWidths;
    });
    setCurrentImageIndex(idx);
    onImageChange?.(idx);
  }, [currentImageIndex, onImageChange]);

  return (
    <Pressable style={styles.container} onPress={onClick}>
      {/* Progress Bars */}
      {showProgressBars && hasMultipleImages && (
        <View style={styles.progressContainer}>
          {images!.map((_, idx) => (
            <Pressable
              key={idx}
              style={styles.progressBarBackground}
              onPress={(e) => handleProgressBarClick(e, idx)}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressWidths[idx] || 0}%`,
                    opacity: idx <= currentImageIndex ? 1 : 0.5,
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* Main Image */}
      {hasImages && !imageError && images![currentImageIndex] ? (
        <Image
          source={{ uri: images![currentImageIndex] }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Home size={120} color="#d1d5db" />
        </View>
      )}

      {/* Gradient Overlay */}
      <View style={styles.gradientOverlay} />

      {/* Navigation Areas */}
      {hasMultipleImages && (
        <>
          <Pressable style={styles.navAreaLeft} onPress={handlePrevImage} />
          <Pressable style={styles.navAreaRight} onPress={handleNextImage} />
        </>
      )}

      {/* Custom Overlay */}
      {overlay}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressContainer: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
    paddingVertical: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    // Note: React Native doesn't support CSS gradients directly
    // This would need a LinearGradient component from expo-linear-gradient
    backgroundColor: 'transparent',
  },
  navAreaLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 100,
    width: '25%',
    zIndex: 5,
  },
  navAreaRight: {
    position: 'absolute',
    right: 0,
    top: 100,
    bottom: 100,
    width: '25%',
    zIndex: 5,
  },
});
