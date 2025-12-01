import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Pressable, Animated } from 'react-native';
import { MapPin, Home, House } from 'lucide-react';
import { colors } from '../theme';

export interface Property {
  id: string;
  title: string;
  location: string;
  address?: string;
  price: number;
  sqm: number;
  rooms: number;
  images: string[];
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
  const progressAnims = useRef<Animated.Value[]>(
    property.images.map(() => new Animated.Value(0))
  ).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Reset when becoming active
  useEffect(() => {
    if (isActive) {
      setCurrentImage(0);
      progressAnims.forEach(anim => anim.setValue(0));
    }
  }, [isActive]);

  // Auto-slideshow effect
  useEffect(() => {
    if (!isActive) return;

    const runSlideshow = () => {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const pricePerSqm = property.sqm > 0 ? Math.round(property.price / property.sqm) : 0;

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

      {/* Investment Score Badge - Top Right (below favorite button) */}
      {(property.ai_investment_score !== undefined || property.aiScore !== undefined) && (
        <View style={styles.scoreBadge}>
          <View style={[styles.scoreDot, { backgroundColor: getScoreColor(property.score_color) }]} />
          <Text style={styles.scoreText}>
            {property.ai_investment_score !== undefined ? property.ai_investment_score : property.aiScore}/100
          </Text>
        </View>
      )}

      {/* Owner Badge or Favorite Button - Top Right */}
      {isOwner ? (
        <View style={styles.favoriteButton}>
          <House size={32} color="white" strokeWidth={1.5} fill="#22C55E" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }} />
        </View>
      ) : onFavorite ? (
        <Pressable
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation?.();
            onFavorite(e);
          }}
        >
          <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>
            ♥
          </Text>
        </Pressable>
      ) : null}

      {/* Property Info Overlay - Bottom */}
      <View style={styles.infoOverlay}>
        <Text style={styles.title} numberOfLines={1}>
          {property.title}
        </Text>
        <View style={styles.locationRow}>
          <MapPin size={18} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
          <Text style={styles.location} numberOfLines={1}>
            {property.location}{showAddress && property.address ? ` • ${property.address}` : ''}
          </Text>
        </View>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(property.price)}</Text>
          <Text style={styles.details}>
            {property.sqm} m² • {property.rooms} Zi.{pricePerSqm > 0 ? ` • ${formatPrice(pricePerSqm)}/m²` : ''}
          </Text>
        </View>
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
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
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
    textAlign: 'right',
  },
});
