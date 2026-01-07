'use client';

import { MapPin, Lock, LockOpen } from 'lucide-react';
import { CSSProperties } from 'react';

interface LocationDisplayProps {
  /** Stadt/Ort */
  location?: string;
  /** Straße mit Hausnummer */
  address?: string | null;
  /** Postleitzahl */
  postalCode?: string | null;
  /** Ob die Adresse angezeigt werden soll */
  showAddress?: boolean;
  /** Callback wenn Adresse angefragt wird */
  onRequestAddress?: () => void;
  /** Ob ein Link zu Google Maps angezeigt werden soll */
  linkToMaps?: boolean;
  /** Ob der aktuelle User der Owner ist (Schloss wird nicht angezeigt) */
  isOwner?: boolean;
  /** Ob das Schloss-Icon angezeigt werden soll (default: false - wird extern angezeigt) */
  showLockIcon?: boolean;
  className?: string;
  iconSize?: number;
  fontSize?: number;
  style?: CSSProperties;
}

/**
 * Wiederverwendbare Komponente zur Anzeige von Standortinformationen
 * Kombiniert Straße, PLZ und Ort zu einer vollständigen Adresse
 */
export function LocationDisplay({
  location,
  address,
  postalCode,
  showAddress = true,
  onRequestAddress,
  linkToMaps = true,
  isOwner = false,
  showLockIcon = false,
  className = '',
  iconSize = 18,
  fontSize = 18,
  style,
}: LocationDisplayProps) {
  // Build full address from street, postal_code and location (city)
  const buildDisplayAddress = (): string => {
    const parts: string[] = [];

    // Add street address if available and showAddress is true
    if (showAddress && address) {
      parts.push(address);
    }

    // Combine postal_code and location (city) with space
    const cityPart = [postalCode, location].filter(Boolean).join(' ');
    if (cityPart) parts.push(cityPart);

    // Join street and city with comma
    return parts.join(', ') || '-';
  };

  const displayAddress = buildDisplayAddress();
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`;

  const content = (
    <>
      <MapPin size={iconSize} className="flex-shrink-0" />
      <span style={{ fontSize }}>
        {displayAddress}
      </span>
    </>
  );

  // Show locked icon if address is hidden but available (consent not given)
  if (!showAddress && address && onRequestAddress) {
    return (
      <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-200 ${className}`} style={style}>
        <MapPin size={iconSize} className="flex-shrink-0" />
        <span style={{ fontSize }}>
          {[postalCode, location].filter(Boolean).join(' ') || '-'}
        </span>
        {showLockIcon && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRequestAddress();
            }}
            className="ml-3 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 hover:border-amber-400 transition-all group shadow-sm hover:shadow-md cursor-pointer z-10"
            title="Adresse freischalten"
            type="button"
          >
            <Lock
              size={28}
              className="text-amber-600 group-hover:text-amber-700 transition-colors"
            />
          </button>
        )}
      </div>
    );
  }

  // With Google Maps link and unlocked icon (consent given)
  if (linkToMaps && displayAddress !== '-') {
    return (
      <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-200 ${className}`} style={style}>
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-primary dark:hover:text-primary-light transition-colors cursor-pointer"
        >
          {content}
        </a>
        {/* Show unlocked icon if address was protected (consent given) - only for non-owners */}
        {showLockIcon && !isOwner && address && (
          <span
            className="ml-3 p-3 rounded-xl bg-green-50 border-2 border-green-200 shadow-sm"
            title="Adresse freigeschaltet"
          >
            <LockOpen size={28} className="text-green-600" />
          </span>
        )}
      </div>
    );
  }

  // Without link
  return (
    <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-200 ${className}`} style={style}>
      {content}
      {/* Show unlocked icon if address is visible and was protected - only for non-owners */}
      {showLockIcon && !isOwner && showAddress && address && (
        <span
          className="ml-3 p-3 rounded-xl bg-green-50 border-2 border-green-200 shadow-sm"
          title="Adresse freigeschaltet"
        >
          <LockOpen size={28} className="text-green-600" />
        </span>
      )}
    </div>
  );
}
