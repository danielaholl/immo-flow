'use client';

import { MapPin } from 'lucide-react';
import { CSSProperties } from 'react';

interface LocationDisplayProps {
  location: string;
  address?: string | null;
  showAddress?: boolean;
  onRequestAddress?: () => void;
  className?: string;
  iconSize?: number;
  style?: CSSProperties;
}

export function LocationDisplay({
  location,
  address,
  showAddress = false,
  onRequestAddress,
  className = '',
  iconSize = 18,
  style,
}: LocationDisplayProps) {
  return (
    <div className={`flex items-center gap-2 text-gray-600 ${className}`} style={style}>
      <MapPin size={iconSize} className="flex-shrink-0" />
      <span>
        {location}
        {showAddress && address && ` • ${address}`}
        {!showAddress && address && onRequestAddress && (
          <button
            onClick={onRequestAddress}
            className="ml-2 text-primary underline hover:text-primary/80 transition-colors"
          >
            Adresse anzeigen
          </button>
        )}
      </span>
    </div>
  );
}
