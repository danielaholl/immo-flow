'use client';

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { House, Heart } from 'lucide-react';
import { colors } from '../../../theme';
import type { PropertyCardProps } from './PropertyCard.types';
import { usePropertyCardLogic } from './PropertyCard.logic';
import { PropertyImageSlideshow } from '../PropertyImageSlideshow';

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

  return (
    <View style={styles.card}>
      <PropertyImageSlideshow
        images={property.images}
        title={property.title}
        duration={slideshowDuration}
        isActive={isActive}
        onSlideshowComplete={onSlideshowComplete}
        onClick={onPress}
        propertyType={property.propertyType}
        rounded="none"
        aspectRatio="auto"
        className="h-full"
        overlay={
          <>
            {/* AI Rating Badge */}
            {logic.badgeInfo && (
              <View style={[styles.ratingBadge, { borderColor: logic.badgeInfo.color }]}>
                <View style={[styles.ratingDot, { backgroundColor: logic.badgeInfo.dotColor }]} />
                <View>
                  <Text style={[styles.ratingLabel, { color: logic.badgeInfo.color }]}>
                    {logic.badgeInfo.label}
                  </Text>
                  <Text style={styles.ratingScore}>
                    {logic.score !== undefined && logic.score !== null ? `${logic.score}/100` : '---'}
                  </Text>
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
          </>
        }
      />
    </View>
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
    cursor: 'pointer',
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
