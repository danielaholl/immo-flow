'use client';

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react';
import type { PropertyInfoOverlayProps, PropertyType } from './PropertyInfoOverlay.types';

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  apartment: 'Wohnung',
  house: 'Haus',
  villa: 'Villa',
  commercial: 'Gewerbe',
  land: 'Grundstück',
  office: 'Büro',
  retail: 'Einzelhandel',
  industrial: 'Industrie',
  parking: 'Stellplatz',
  multi_family: 'Mehrfamilienhaus',
};

export function PropertyInfoOverlay({
  propertyType,
  title,
  location,
  address,
  postalCode,
  showAddress = true,
  formattedPrice,
  rooms,
  sqm,
  formattedPricePerSqm,
  yearBuilt,
  className = '',
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
        <div
          className="absolute bottom-0 left-0 right-0 h-52 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)',
          }}
        />
      )}

      {/* Property Info */}
      <View style={[styles.infoOverlay, style]} className={className}>
        {/* Property Type Badge */}
        {propertyType && (
          <span className="inline-flex w-fit px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100/60 text-rose-700 backdrop-blur-sm border border-rose-200 shadow-sm mb-2">
            {PROPERTY_TYPE_LABELS[propertyType] || 'Immobilie'}
          </span>
        )}
        <div
          className="text-white font-bold text-xl mb-0.5 truncate"
          style={{
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
            letterSpacing: '-0.01em',
          }}
          title={title}
        >
          {title}
        </div>
        <Text style={styles.details}>
          {rooms && <><Text style={styles.detailsBold}>{rooms}</Text> Zi</>}
          {rooms && ' • '}
          <Text style={styles.detailsBold}>{sqm}</Text> m²
          {formattedPricePerSqm && ' • '}
          {formattedPricePerSqm && <><Text style={styles.detailsBold}>{formattedPricePerSqm}</Text>/m²</>}
          {yearBuilt && ' • '}
          {yearBuilt && <>Bj. <Text style={styles.detailsBold}>{yearBuilt}</Text></>}
        </Text>
        <Text style={styles.price}>{formattedPrice}</Text>
        {displayAddress !== '-' && (
          <View style={styles.locationRow}>
            <MapPin size={14} color="rgba(255, 255, 255, 0.85)" strokeWidth={2} />
            <Text style={styles.location}>{displayAddress}</Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 20,
    pointerEvents: 'none',
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
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  price: {
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  details: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 8,
  },
  detailsBold: {
    fontWeight: '700',
  },
});
