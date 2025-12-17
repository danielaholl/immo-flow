'use client';

import { MapPin } from 'lucide-react';
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

  // Show "Adresse anzeigen" button if address is hidden but available
  if (!showAddress && address && onRequestAddress) {
    return (
      <div className={`flex items-center gap-2 text-gray-600 ${className}`} style={style}>
        <MapPin size={iconSize} className="flex-shrink-0" />
        <span style={{ fontSize }}>
          {[postalCode, location].filter(Boolean).join(' ') || '-'}
          <button
            onClick={onRequestAddress}
            className="ml-2 text-primary underline hover:text-primary/80 transition-colors"
          >
            Adresse anzeigen
          </button>
        </span>
      </div>
    );
  }

  // With Google Maps link
  if (linkToMaps && displayAddress !== '-') {
    return (
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2 text-gray-600 hover:text-primary transition-colors cursor-pointer w-fit ${className}`}
        style={style}
      >
        {content}
      </a>
    );
  }

  // Without link
  return (
    <div className={`flex items-center gap-2 text-gray-600 ${className}`} style={style}>
      {content}
    </div>
  );
}
