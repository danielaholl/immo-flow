import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { MapPin, Home, House, Heart } from 'lucide-react';
import { colors } from '../theme';

export type PropertyType =
  | 'apartment'      // Wohnung
  | 'house'          // Haus
  | 'villa'          // Villa
  | 'commercial'     // Gewerbe
  | 'land'           // Grundstück
  | 'office'         // Büro
  | 'retail'         // Einzelhandel
  | 'industrial'     // Industrie
  | 'parking'        // Stellplatz/Garage
  | 'multi_family';  // Mehrfamilienhaus

export interface Property {
  id: string;
  title: string;
  location: string;
  address?: string;
  price: number;
  sqm: number;
  rooms: number;
  images: string[];
  propertyType?: PropertyType;
  aiScore?: number;
  ai_investment_score?: number;
  score_color?: 'green' | 'yellow' | 'red';
  yield?: number;
  features?: string[];
  energyClass?: string;
}

export interface PropertyCardProps {
  property: Property;
  onPress?: () => void;
  onFavorite?: (e?: any) => void;
  onDismiss?: (e?: any) => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact' | 'story';
  isActive?: boolean;
  onSlideshowComplete?: () => void;
  slideshowDuration?: number;
  /** Whether to show the full address (requires user consent) */
  showAddress?: boolean;
  /** Whether the current user is the owner of this property */
  isOwner?: boolean;
}

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
  const [currentImage, setCurrentImage] = useState(0);
  const [imageError, setImageError] = useState(false);
  const progressAnimsRef = useRef<Animated.Value[]>([]);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Initialize or update progressAnims when images change
  const progressAnims = useMemo(() => {
    // Ensure we have the right number of animated values
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
      // Check if progressAnims has the current image animation
      if (!progressAnims[currentImage]) {
        console.warn(`progressAnims[${currentImage}] is undefined. Images length: ${property.images.length}, progressAnims length: ${progressAnims.length}`);
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
            // Slideshow complete for this card
            onSlideshowComplete?.();
          }
        }
      });
    };

    runSlideshow();

    return () => {
      animationRef.current?.stop();
    };
  }, [isActive, currentImage, property.images.length, slideshowDuration]);

  const getScoreColor = (color?: 'green' | 'yellow' | 'red') => {
    switch (color) {
      case 'green':
        return '#22C55E'; // Green - Excellent
      case 'yellow':
        return '#F59E0B'; // Yellow - Moderate
      case 'red':
        return '#EF4444'; // Red - Risky
      default:
        return '#9CA3AF'; // Gray - No score
    }
  };

  // Get badge info based on AI score
  const getBadgeInfo = (score?: number, scoreColor?: 'green' | 'yellow' | 'red') => {
    if (score === undefined) return null;

    if (scoreColor === 'green' || score >= 75) {
      return {
        label: 'Top Deal',
        color: '#22C55E',
        dotColor: '#22C55E',
      };
    } else if (scoreColor === 'yellow' || score >= 50) {
      return {
        label: 'Prüfen',
        color: '#F59E0B',
        dotColor: '#F59E0B',
      };
    } else {
      return {
        label: 'Finger weg',
        color: '#EF4444',
        dotColor: '#EF4444',
      };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const pricePerSqm = property.sqm > 0 ? Math.round(property.price / property.sqm) : 0;

  // Helper to get German property type label
  const getPropertyTypeLabel = (type?: PropertyType): string => {
    switch (type) {
      case 'apartment':
        return 'Wohnung';
      case 'house':
        return 'Haus';
      case 'villa':
        return 'Villa';
      case 'commercial':
        return 'Gewerbe';
      case 'land':
        return 'Grundstück';
      case 'office':
        return 'Büro';
      case 'retail':
        return 'Einzelhandel';
      case 'industrial':
        return 'Industrie';
      case 'parking':
        return 'Stellplatz';
      case 'multi_family':
        return 'Mehrfamilienhaus';
      default:
        return 'Immobilie';
    }
  };

  // Generate dynamic property title from data (2 lines)
  const getPropertyTitle = (): string => {
    const typeLabel = getPropertyTypeLabel(property.propertyType);
    const location = property.location.replace(/\s+/g, '-'); // Replace spaces with hyphens
    const rooms = property.rooms;

    // For properties with rooms, use 2-line format
    if (rooms && rooms > 0) {
      return `${rooms}-Zi. ${typeLabel}\n${location}`;
    }

    // For land or properties without rooms
    return `${typeLabel}\n${location}`;
  };

  const handleImageTap = (_e: any) => {
    // Always navigate to detail page on click
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
    // Set all previous bars to full, current and after to empty
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
      {!imageError && property.images[currentImage] ? (
        <Image
          source={{ uri: property.images[currentImage] }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          {/* 50% of card height (480px) = 240px */}
          <Home size={240} color="#d1d5db" />
        </View>
      )}

      {/* Gradient Overlay for better text visibility */}
      <View style={styles.gradientOverlay} />

      {/* Navigation Areas for Image Slideshow */}
      {property.images.length > 1 && (
        <>
          <Pressable style={styles.navAreaLeft} onPress={handlePrevImage} />
          <Pressable style={styles.navAreaRight} onPress={handleNextImage} />
        </>
      )}

      {/* AI Rating Badge - Top Right */}
      {(() => {
        const score = property.ai_investment_score !== undefined ? property.ai_investment_score : property.aiScore;
        const badgeInfo = getBadgeInfo(score, property.score_color);

        if (!badgeInfo) return null;

        return (
          <View style={[
            styles.ratingBadge,
            {
              borderColor: badgeInfo.color,
            }
          ]}>
            <View style={[styles.ratingDot, { backgroundColor: badgeInfo.dotColor }]} />
            <View>
              <Text style={[styles.ratingLabel, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
              <Text style={styles.ratingScore}>{score}/100</Text>
            </View>
          </View>
        );
      })()}

      {/* Action Buttons - Top Right */}
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

      {/* Owner Badge - Top Right */}
      {isOwner && (
        <View style={styles.favoriteButton}>
          <House size={32} color="white" strokeWidth={1.5} fill="#22C55E" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
        </View>
      )}

      {/* Property Info Overlay - Bottom */}
      <View style={styles.infoOverlay}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {property.title}
        </Text>
        <Text style={styles.price}>{formatPrice(property.price)}</Text>
        <Text style={styles.details}>
          {property.sqm} m²{pricePerSqm > 0 ? ` • ${formatPrice(pricePerSqm)}/m²` : ''}
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
    // @ts-ignore - web specific for better clickability
    cursor: 'pointer',
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
    // Using a semi-transparent black gradient effect
    backgroundColor: 'transparent',
    // For web, we'll use CSS gradient
    // @ts-ignore - web specific
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
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
  scoreBadge: {
    position: 'absolute',
    bottom: 100,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
  },
  scoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as any,
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
    // @ts-ignore - web specific
    cursor: 'pointer',
  },
  ratingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  ratingLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700' as any,
    marginBottom: 1,
  },
  ratingScore: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '500' as any,
  },
  favoriteButton: {
    position: 'absolute',
    top: 40,
    right: 12,
    padding: 12,
    zIndex: 20,
    // @ts-ignore - web specific for better clickability
    cursor: 'pointer',
  },
  favoriteIcon: {
    fontSize: 38,
    color: 'rgba(60, 60, 60, 0.7)',
    // @ts-ignore - web specific
    WebkitTextStroke: '2px white',
  },
  favoriteIconActive: {
    color: '#FF385C',
    // @ts-ignore - web specific
    WebkitTextStroke: '2px white',
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
    fontWeight: '700' as any,
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  location: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 22,
    fontWeight: '800' as any,
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
  scoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  scoreInfoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreInfoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500' as any,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    // @ts-ignore - web specific
    cursor: 'pointer',
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
    fontWeight: '400' as any,
  },
});
