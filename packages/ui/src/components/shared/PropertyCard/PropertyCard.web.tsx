'use client';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { House } from 'lucide-react';
import { colors } from '../../../theme';
import type { PropertyCardProps } from './PropertyCard.types';
import { usePropertyCardLogic } from './PropertyCard.logic';
import { PropertyImageSlideshow } from '../PropertyImageSlideshow';
import { GlassActionButton } from '../../web/GlassActionButton';
import { PropertyScoreBadge } from '../../web/PropertyScoreBadge';

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
        videoUrl={property.video_url}
        title={property.title}
        duration={slideshowDuration}
        isActive={isActive}
        onSlideshowComplete={onSlideshowComplete}
        onClick={onPress}
        propertyType={property.propertyType}
        rounded="none"
        aspectRatio="auto"
        className="h-full"
        showGradient={true}
        overlay={
          <>
            {/* AI Score Badge - Reusable Component */}
            {logic.score !== undefined && logic.score !== null && (
              <div className="absolute top-12 right-3 z-15">
                <PropertyScoreBadge score={logic.score} variant="overlay" />
              </div>
            )}

            {/* Action Buttons - Reusable Components */}
            <div className="absolute bottom-5 right-3 flex flex-row gap-2 z-20">
              <GlassActionButton
                type="dismiss"
                onClick={(e) => onDismiss?.(e as any)}
              />
              <GlassActionButton
                type="favorite"
                isActive={isFavorite}
                onClick={(e) => onFavorite?.(e as any)}
              />
            </div>

            {/* Owner Badge - Glassmorphism */}
            {isOwner && (
              <div
                className="absolute top-12 right-3 w-12 h-12 rounded-full flex items-center justify-center z-20 shadow-xl"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <House size={24} color="white" strokeWidth={1.5} />
              </div>
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
});
