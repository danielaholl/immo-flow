'use client';

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { House, Heart, X, Share2, MessageSquare } from 'lucide-react';
import { colors } from '../../../theme';
import type { PropertyCardProps } from './PropertyCard.types';
import { usePropertyCardLogic } from './PropertyCard.logic';
import { PropertyImageSlideshow } from '../PropertyImageSlideshow';
import { GlassButton } from '../../web/GlassButton';
import { PropertyScoreBadge } from '../../web/PropertyScoreBadge';
import { PropertyInfoOverlay } from '../PropertyInfoOverlay';

export function PropertyCard({
  property,
  onPress,
  onFavorite,
  onDismiss,
  onShare,
  onMessage,
  isFavorite = false,
  variant: _variant = 'story',
  isActive = false,
  onSlideshowComplete,
  slideshowDuration = 3000,
  showAddress = true,
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
        overlay={
          <>
            {/* AI Score Badge - Reusable Component */}
            {logic.score !== undefined && logic.score !== null && (
              <div className="absolute top-8 right-3 z-10 pointer-events-none">
                <PropertyScoreBadge score={logic.score} variant="overlay" />
              </div>
            )}

            {/* Action Buttons - Reusable Components */}
            <div className="absolute bottom-5 right-3 flex flex-col gap-2 z-20">
              <GlassButton
                variant="default"
                iconOnly
                subtleBorder
                iconLeft={<Share2 strokeWidth={2} />}
                onClick={(e) => onShare?.(e as any)}
                tooltip="Teilen"
                ariaLabel="Teilen"
              />
              <GlassButton
                variant="default"
                iconOnly
                subtleBorder
                iconLeft={<MessageSquare strokeWidth={2} />}
                onClick={(e) => onMessage?.(e as any)}
                tooltip="Nachricht senden"
                ariaLabel="Nachricht senden"
              />
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

            {/* Property Info Overlay with Gradient Background */}
            <PropertyInfoOverlay
              title={property.title}
              location={property.location}
              address={property.address}
              postalCode={property.postal_code}
              showAddress={showAddress}
              formattedPrice={logic.formattedPrice}
              rooms={property.rooms}
              sqm={property.sqm}
              formattedPricePerSqm={logic.formattedPricePerSqm}
              showGradient={true}
            />
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
});
