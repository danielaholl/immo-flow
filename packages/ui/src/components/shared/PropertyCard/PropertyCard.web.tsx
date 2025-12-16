'use client';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { House, Heart, X, MapPin } from 'lucide-react';
import { colors } from '../../../theme';
import type { PropertyCardProps } from './PropertyCard.types';
import { usePropertyCardLogic } from './PropertyCard.logic';
import { PropertyImageSlideshow } from '../PropertyImageSlideshow';
import { GlassButton } from '../../web/GlassButton';
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
              <div className="absolute top-12 right-3 z-10 pointer-events-none">
                <PropertyScoreBadge score={logic.score} variant="overlay" />
              </div>
            )}

            {/* Action Buttons - Reusable Components */}
            <div className="absolute bottom-5 right-3 flex flex-row gap-2 z-20">
              <GlassButton
                variant="default"
                iconOnly
                subtleBorder
                iconLeft={<X strokeWidth={2.5} />}
                onClick={(e) => onDismiss?.(e as any)}
                tooltip="Nicht interessiert"
                ariaLabel="Nicht interessiert"
              />
              <GlassButton
                variant="favorite"
                iconOnly
                subtleBorder
                iconLeft={<Heart fill={isFavorite ? '#FF385C' : 'none'} strokeWidth={2} />}
                onClick={(e) => onFavorite?.(e as any)}
                tooltip={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                ariaLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              />
            </div>

            {/* Owner Badge - Glassmorphism */}
            {isOwner && (
              <div
                className="absolute top-12 right-3 w-12 h-12 rounded-full flex items-center justify-center z-10 shadow-xl pointer-events-none"
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

            {/* Property Info Overlay - pointer-events-none to allow clicks through */}
            <View style={[styles.infoOverlay, { pointerEvents: 'none' }]}>
              <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
                {property.title}
              </Text>
              {property.location && (
                <View style={styles.locationRow}>
                  <MapPin size={14} color="rgba(255, 255, 255, 0.85)" strokeWidth={2} />
                  <Text style={styles.location}>{property.location}</Text>
                </View>
              )}
              <Text style={styles.price}>{logic.formattedPrice}</Text>
              <Text style={styles.details}>
                {property.rooms} Zi • {property.sqm} m²
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
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  location: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
