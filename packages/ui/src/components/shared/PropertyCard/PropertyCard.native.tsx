import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { Home, House, Heart } from 'lucide-react';
import { colors } from '../../../theme';
import type { PropertyCardProps } from './PropertyCard.types';
import { usePropertyCardLogic } from './PropertyCard.logic';

export function PropertyCard({
  property,
  onPress,
  onFavorite,
  onDismiss,
  isFavorite = false,
  variant: _variant = 'story',
  isActive = false,
  onSlideshowComplete,
  slideshowDuration = 3000,
  showAddress = false,
  isOwner = false,
}: PropertyCardProps) {
  const logic = usePropertyCardLogic(property);

  // Slideshow State mit Animated API
  const [currentImage, setCurrentImage] = useState(0);
  const progressAnimsRef = useRef<Animated.Value[]>([]);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Initialize or update progressAnims when images change
  const progressAnims = useMemo(() => {
    const imageCount = property.images.length;

    // If we have too many, trim
    if (progressAnimsRef.current.length > imageCount) {
      progressAnimsRef.current = progressAnimsRef.current.slice(0, imageCount);
    }

    // If we have too few, add more
    while (progressAnimsRef.current.length < imageCount) {
      progressAnimsRef.current.push(new Animated.Value(0));
    }

    return progressAnimsRef.current;
  }, [property.images.length]);

  // Reset when becoming active
  useEffect(() => {
    if (isActive) {
      setCurrentImage(0);
      progressAnims.forEach(anim => anim.setValue(0));
    }
  }, [isActive, progressAnims]);

  // Auto-slideshow effect
  useEffect(() => {
    if (!isActive || !property.images.length) return;

    const runSlideshow = () => {
      if (!progressAnims[currentImage]) {
        console.warn(`progressAnims[${currentImage}] is undefined`);
        return;
      }

      // Animate the current progress bar
      progressAnims[currentImage].setValue(0);
      animationRef.current = Animated.timing(progressAnims[currentImage], {
        toValue: 1,
        duration: slideshowDuration,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (finished) {
          if (currentImage < property.images.length - 1) {
            setCurrentImage(prev => prev + 1);
          } else {
            onSlideshowComplete?.();
          }
        }
      });
    };

    runSlideshow();

    return () => {
      animationRef.current?.stop();
    };
  }, [isActive, currentImage, property.images.length, slideshowDuration, onSlideshowComplete, progressAnims]);

  const handleImageTap = (_e: any) => {
    onPress?.();
  };

  const handlePrevImage = (e: any) => {
    e.stopPropagation();
    if (currentImage > 0) {
      animationRef.current?.stop();
      progressAnims[currentImage].setValue(0);
      setCurrentImage(prev => prev - 1);
    }
  };

  const handleNextImage = (e: any) => {
    e.stopPropagation();
    if (currentImage < property.images.length - 1) {
      animationRef.current?.stop();
      progressAnims[currentImage].setValue(1);
      setCurrentImage(prev => prev + 1);
    }
  };

  const handleProgressBarClick = (e: any, idx: number) => {
    e.stopPropagation();
    if (idx === currentImage) return;

    animationRef.current?.stop();
    progressAnims.forEach((anim, i) => {
      if (i < idx) {
        anim.setValue(1);
      } else {
        anim.setValue(0);
      }
    });
    setCurrentImage(idx);
  };


  return (
    <Pressable style={styles.card} onPress={handleImageTap}>
      {/* Progress Bars (WhatsApp Story Style) */}
      <View style={styles.progressContainer}>
        {property.images.map((_, idx) => (
          <Pressable
            key={idx}
            style={styles.progressBarBackground}
            onPress={(e) => handleProgressBarClick(e, idx)}
          >
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnims[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  opacity: idx < currentImage ? 1 : idx === currentImage ? 1 : 0.5,
                  backgroundColor: '#FFFFFF',
                },
              ]}
            />
          </Pressable>
        ))}
      </View>

      {/* Main Image */}
      {!logic.imageError && property.images[currentImage] ? (
        <Image
          source={{ uri: property.images[currentImage] }}
          style={styles.image}
          resizeMode="cover"
          onError={() => logic.setImageError(true)}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Home size={240} color="#d1d5db" />
        </View>
      )}

      {/* Gradient Overlay - Native uses backgroundColor fallback */}
      <View style={styles.gradientOverlay} />

      {/* Navigation Areas */}
      {property.images.length > 1 && (
        <>
          <Pressable style={styles.navAreaLeft} onPress={handlePrevImage} />
          <Pressable style={styles.navAreaRight} onPress={handleNextImage} />
        </>
      )}

      {/* AI Rating Badge */}
      {logic.badgeInfo && (
        <View style={[styles.ratingBadge, { borderColor: logic.badgeInfo.color }]}>
          <View style={[styles.ratingDot, { backgroundColor: logic.badgeInfo.dotColor }]} />
          <View>
            <Text style={[styles.ratingLabel, { color: logic.badgeInfo.color }]}>
              {logic.badgeInfo.label}
            </Text>
            <Text style={styles.ratingScore}>{logic.score}/100</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.topRightButtons}>
        <Pressable
          style={[styles.topActionButton, styles.actionButtonDislike]}
          onPress={(e) => {
            e.stopPropagation();
            onDismiss?.(e);
          }}
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
        <Pressable
          style={[styles.topActionButton, styles.actionButtonFavorite]}
          onPress={(e) => {
            e.stopPropagation();
            onFavorite?.(e);
          }}
        >
          <Heart
            size={24}
            color="#10B981"
            fill={isFavorite ? '#10B981' : 'none'}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* Owner Badge */}
      {isOwner && (
        <View style={styles.favoriteButton}>
          <House size={32} color="white" strokeWidth={1.5} fill="#22C55E" />
        </View>
      )}

      {/* Property Info Overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {property.title}
        </Text>
        <Text style={styles.price}>{logic.formattedPrice}</Text>
        <Text style={styles.details}>
          {property.sqm} m²
          {logic.formattedPricePerSqm ? ` • ${logic.formattedPricePerSqm}/m²` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    height: 480,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fallback for native
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
  ratingBadge: {
    position: 'absolute',
    top: 50,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    zIndex: 15,
  },
  topRightButtons: {
    position: 'absolute',
    bottom: 20,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 20,
  },
  topActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  ratingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  ratingLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },
  ratingScore: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 12,
    padding: 12,
    zIndex: 20,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  details: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
  },
  actionButtonDislike: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  actionButtonFavorite: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  closeIcon: {
    fontSize: 28,
    color: '#EF4444',
    fontWeight: '400',
  },
});
