'use client';

import React from 'react';
import {
  Building2,
  Home,
  Castle,
  Briefcase,
  TreePine,
  Building,
  Store,
  Factory,
  Square,
} from 'lucide-react';
import type { PropertyType } from '../shared/PropertyCard/PropertyCard.types';

export interface PropertyTypeBadgeProps {
  /** Property type to display */
  propertyType: PropertyType;
  /** Badge size */
  size?: 'sm' | 'md';
  /** Badge variant - 'light' for dark backgrounds (default), 'dark' for light backgrounds */
  variant?: 'light' | 'dark';
  /** Additional CSS classes */
  className?: string;
}

// Property type labels in German
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

// Icon mapping for property types
const PROPERTY_TYPE_ICONS: Record<PropertyType, any> = {
  apartment: Building2,
  house: Home,
  villa: Castle,
  commercial: Briefcase,
  land: TreePine,
  office: Building,
  retail: Store,
  industrial: Factory,
  parking: Square,
  multi_family: Building,
};

// Size configuration
const sizeConfig = {
  sm: { container: 36, icon: 18 },
  md: { container: 40, icon: 20 },
};

export function PropertyTypeBadge({
  propertyType,
  size = 'md',
  variant = 'light',
  className = '',
}: PropertyTypeBadgeProps) {
  const Icon = PROPERTY_TYPE_ICONS[propertyType];
  const label = PROPERTY_TYPE_LABELS[propertyType];
  const { container, icon } = sizeConfig[size];

  if (!Icon) {
    return null;
  }

  // Variant-specific styles
  const variantStyles = variant === 'dark'
    ? {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        iconColor: 'white',
        textColor: 'text-white',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
      }
    : {
        backgroundColor: 'transparent',
        iconColor: 'white',
        textColor: 'text-white',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)',
      };

  return (
    <div className={`inline-block ${className}`}>
      {/* Badge Container with Icon and Label */}
      <div
        className="rounded-full flex items-center justify-center gap-1.5 pointer-events-none px-2.5 py-1"
        style={{
          height: container,
          backgroundColor: variantStyles.backgroundColor,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: 'none',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        }}
        aria-label={label}
      >
        <Icon size={icon} color={variantStyles.iconColor} strokeWidth={1.5} />
        <span
          className={`${variantStyles.textColor} font-semibold whitespace-nowrap`}
          style={{
            fontSize: size === 'sm' ? '12px' : '13px',
            textShadow: variantStyles.textShadow,
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
