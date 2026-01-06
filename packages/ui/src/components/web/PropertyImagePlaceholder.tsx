'use client';

import { ImageOff } from 'lucide-react';
import type { PropertyType } from '../shared/PropertyCard/PropertyCard.types';

export interface PropertyImagePlaceholderProps {
  /** Additional CSS classes */
  className?: string;
  /** Size of the center icon (default: 42) */
  iconSize?: number;
  /** Blur amount in pixels (default: 3) */
  blur?: number;
  /** Label text below the icon (default: 'Kein Bild') */
  label?: string;
  /** Show the label text (default: true) */
  showLabel?: boolean;
  /** Property type to determine which placeholder image to use */
  propertyType?: PropertyType | string;
  /** Custom placeholder image URL (overrides propertyType-based selection) */
  customImage?: string;
}

// Property types that should use house placeholder
const HOUSE_TYPES = ['house', 'villa', 'multi_family', 'land'];

/**
 * PropertyImagePlaceholder - Reusable fallback component for missing/broken property images
 *
 * Features:
 * - Blurred placeholder background image (house or apartment based on propertyType)
 * - Centered "Kein Bild" icon and label
 * - Configurable blur, icon size, and label text
 * - Can be used as fallback in img onError or when no image URL exists
 *
 * @example
 * // Basic usage
 * <PropertyImagePlaceholder className="w-full h-64" />
 *
 * @example
 * // With property type
 * <PropertyImagePlaceholder propertyType="house" className="aspect-video" />
 *
 * @example
 * // Custom configuration
 * <PropertyImagePlaceholder
 *   blur={5}
 *   iconSize={48}
 *   label="Bild nicht verfügbar"
 *   className="rounded-xl"
 * />
 */
export function PropertyImagePlaceholder({
  className = '',
  iconSize = 42,
  blur = 3,
  label = 'Kein Bild',
  showLabel = true,
  propertyType,
  customImage,
}: PropertyImagePlaceholderProps) {
  // Determine which placeholder image to use
  const isHouseType = propertyType && HOUSE_TYPES.includes(propertyType);
  const placeholderImage = customImage
    ? customImage
    : isHouseType
      ? '/placeholders/placeholder_house.png'
      : '/placeholders/placeholder_flat.png';

  return (
    <div className={`relative overflow-hidden pointer-events-none ${className}`}>
      {/* Background Image with blur effect */}
      <img
        src={placeholderImage}
        alt="Placeholder"
        className="w-full h-full object-cover"
        style={{
          filter: `blur(${blur}px)`,
          transform: 'scale(1.05)'
        }}
      />

      {/* Centered icon with label */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
        <div className="flex flex-col items-center gap-3">
          <ImageOff
            size={iconSize}
            className="text-white/80"
            strokeWidth={1.5}
          />
          {showLabel && (
            <span className="text-white/80 text-lg font-medium">
              {label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
