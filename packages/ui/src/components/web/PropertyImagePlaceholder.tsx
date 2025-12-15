'use client';

import { ImageOff, Home, Building2 } from 'lucide-react';

type PropertyType =
  | 'apartment'
  | 'house'
  | 'villa'
  | 'commercial'
  | 'land'
  | 'office'
  | 'retail'
  | 'industrial'
  | 'parking'
  | 'multi_family';

interface PropertyImagePlaceholderProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  text?: string;
  propertyType?: PropertyType | string;
}

// Property types that should use house placeholder
const HOUSE_TYPES = ['house', 'villa', 'multi_family', 'land'];

export function PropertyImagePlaceholder({
  className = '',
  iconSize = 48,
  showText = false,
  text = 'Kein Bild verfügbar',
  propertyType,
}: PropertyImagePlaceholderProps) {
  // Determine which placeholder image to use
  const isHouseType = propertyType && HOUSE_TYPES.includes(propertyType);
  const placeholderImage = isHouseType
    ? '/placeholders/placeholder_house.png'
    : '/placeholders/placeholder_flat.png';

  // Icon based on property type
  const IconComponent = isHouseType ? Home : Building2;

  return (
    <div className={`relative overflow-hidden pointer-events-none ${className}`}>
      {/* Background Image */}
      <img
        src={placeholderImage}
        alt="Placeholder"
        className="w-full h-full object-cover"
      />

      {/* Glassmorphism overlay with icon */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          }}
        >
          <ImageOff
            size={18}
            className="text-white/70"
            strokeWidth={1.5}
          />
          <span className="text-white/70 text-xs font-medium">
            Beispielbild
          </span>
        </div>
      </div>

      {/* Optional text overlay at bottom */}
      {showText && (
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div
            className="px-4 py-2 rounded-xl text-center"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <p className="text-white/90 text-sm font-medium">{text}</p>
          </div>
        </div>
      )}
    </div>
  );
}
