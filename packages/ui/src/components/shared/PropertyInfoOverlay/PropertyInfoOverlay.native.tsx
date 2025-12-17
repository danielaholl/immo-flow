import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropertyInfoOverlayProps } from './PropertyInfoOverlay.types';

export function PropertyInfoOverlay({
  title,
  location,
  address,
  postalCode,
  showAddress = true,
  formattedPrice,
  rooms,
  sqm,
  formattedPricePerSqm,
  showGradient = true,
  style,
}: PropertyInfoOverlayProps) {
  // Build display address similar to LocationDisplay component
  const buildDisplayAddress = (): string => {
    const parts: string[] = [];

    if (showAddress && address) {
      parts.push(address);
    }

    const cityPart = [postalCode, location].filter(Boolean).join(' ');
    if (cityPart) parts.push(cityPart);

    return parts.join(', ') || '-';
  };

  const displayAddress = buildDisplayAddress();

  return (
    <>
      {/* Gradient Background */}
      {showGradient && (
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
          pointerEvents="none"
        />
      )}

      {/* Property Info */}
      <View style={[styles.infoOverlay, style]} pointerEvents="none">
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>
        {displayAddress !== '-' && (
          <View style={styles.locationRow}>
            <MapPin size={14} color="rgba(255, 255, 255, 0.85)" strokeWidth={2} />
            <Text style={styles.location}>{displayAddress}</Text>
          </View>
        )}
        <Text style={styles.price}>{formattedPrice}</Text>
        <Text style={styles.details}>
          {rooms && `${rooms} Zi • `}
          {sqm} m²
          {formattedPricePerSqm ? ` • ${formattedPricePerSqm}/m²` : ''}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 192, // h-48 = 192px
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
