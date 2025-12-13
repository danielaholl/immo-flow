import { useState, useCallback } from 'react';
import type { Property, PropertyType, BadgeInfo } from './PropertyCard.types';

/**
 * Shared Logic Hook für PropertyCard
 *
 * Enthält alle Business Logic, die auf Web UND Native identisch ist:
 * - Price Formatting
 * - Score Calculation
 * - Badge Info
 * - Property Type Labels
 * - Title Generation
 * - Image Error Handling
 */
export function usePropertyCardLogic(property: Property) {
  const [imageError, setImageError] = useState(false);

  const formatPrice = useCallback((price: number): string => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const getScoreColor = useCallback((color?: 'green' | 'yellow' | 'red'): string => {
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
  }, []);

  const getBadgeInfo = useCallback((
    score?: number,
    scoreColor?: 'green' | 'yellow' | 'red'
  ): BadgeInfo | null => {
    if (score === undefined) return null;

    if (scoreColor === 'green' || score >= 70) {
      return {
        label: 'Exzellent',
        color: '#22C55E',
        dotColor: '#22C55E',
      };
    } else if (scoreColor === 'yellow' || score >= 40) {
      return {
        label: 'Moderat',
        color: '#F59E0B',
        dotColor: '#F59E0B',
      };
    } else {
      return {
        label: 'Risiko',
        color: '#EF4444',
        dotColor: '#EF4444',
      };
    }
  }, []);

  const getPropertyTypeLabel = useCallback((type?: PropertyType): string => {
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
  }, []);

  const getPropertyTitle = useCallback((): string => {
    const typeLabel = getPropertyTypeLabel(property.propertyType);
    const location = property.location.replace(/\s+/g, '-');
    const rooms = property.rooms;

    if (rooms && rooms > 0) {
      return `${rooms}-Zi. ${typeLabel}\n${location}`;
    }

    return `${typeLabel}\n${location}`;
  }, [property.propertyType, property.location, property.rooms, getPropertyTypeLabel]);

  const pricePerSqm = property.sqm > 0 ? Math.round(property.price / property.sqm) : 0;

  const score = property.ai_investment_score !== undefined
    ? property.ai_investment_score
    : property.aiScore;

  const badgeInfo = getBadgeInfo(score, property.score_color);

  return {
    // State
    imageError,
    setImageError,

    // Computed Values
    formattedPrice: formatPrice(property.price),
    formattedPricePerSqm: pricePerSqm > 0 ? formatPrice(pricePerSqm) : null,
    propertyTitle: getPropertyTitle(),
    score,
    badgeInfo,

    // Functions
    formatPrice,
    getScoreColor,
    getBadgeInfo,
    getPropertyTypeLabel,
  };
}
