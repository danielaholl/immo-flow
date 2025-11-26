import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../theme';

export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  sqm: number;
  rooms: number;
  images: string[];
  aiScore?: number;
  yield?: number;
  features?: string[];
  energyClass?: string;
}

export interface PropertyCardProps {
  property: Property;
  onPress?: () => void;
  onFavorite?: () => void;
  isFavorite?: boolean;
  variant?: 'default' | 'compact';
}

export function PropertyCard({
  property,
  onPress,
  onFavorite,
  isFavorite = false,
  variant = 'default',
}: PropertyCardProps) {
  const [currentImage, setCurrentImage] = useState(0);

  const getScoreColor = (score: number) => {
    if (score >= 85) return colors.scoreExcellent;
    if (score >= 70) return colors.scoreGood;
    return colors.scorePoor;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.images[currentImage] || 'https://via.placeholder.com/400x300' }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* AI Score Badge */}
        {property.aiScore !== undefined && (
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(property.aiScore) }]}>
            <Text style={styles.scoreText}>★ {property.aiScore}</Text>
          </View>
        )}

        {/* Favorite Button */}
        {onFavorite && (
          <Pressable style={styles.favoriteButton} onPress={onFavorite}>
            <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
          </Pressable>
        )}

        {/* Energy Class Badge */}
        {property.energyClass && (
          <View style={styles.energyBadge}>
            <Text style={styles.energyText}>{property.energyClass}</Text>
          </View>
        )}

        {/* Image Dots */}
        {property.images.length > 1 && (
          <View style={styles.dotsContainer}>
            {property.images.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === currentImage && styles.activeDot]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Info Section */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {property.title}
        </Text>
        <Text style={styles.location}>📍 {property.location}</Text>

        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatPrice(property.price)}</Text>
          <View style={styles.detailsRow}>
            <Text style={styles.details}>
              {property.sqm} m² • {property.rooms} Zimmer
            </Text>
            {property.yield && (
              <Text style={styles.yieldText}>📈 {property.yield.toFixed(1)}%</Text>
            )}
          </View>
        </View>

        {/* Features */}
        {property.features && property.features.length > 0 && variant === 'default' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.featuresScroll}
          >
            <View style={styles.features}>
              {property.features.slice(0, 5).map((feature, idx) => (
                <View key={idx} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 250,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scoreBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreText: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteIcon: {
    fontSize: 20,
  },
  energyBadge: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
  },
  energyText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.surface,
  },
  info: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    lineHeight: typography.fontSize.lg * typography.lineHeight.tight,
  },
  location: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  priceSection: {
    marginBottom: spacing.md,
  },
  price: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  details: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  yieldText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
    fontWeight: typography.fontWeight.semibold,
  },
  featuresScroll: {
    marginTop: spacing.xs,
  },
  features: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  featureTag: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  featureText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
});
