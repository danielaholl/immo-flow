import { useState, memo } from 'react';
import { MapPin, Eye, Heart, Clock, X, Download } from 'lucide-react';
import { PropertyImagePlaceholder } from '@immoflow/ui';
import Image from 'next/image';

// Score von 0-100 auf 1-5 konvertieren
function toDisplayScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function getScoreColor(displayScore: number): string {
  if (displayScore >= 4) return '#22C55E'; // grün
  if (displayScore === 3) return '#F59E0B'; // gelb
  return '#EF4444'; // rot
}

export interface PropertyListThumbnailProps {
  // Required
  id: string;
  title: string;
  isSelected: boolean;
  onClick: () => void;

  // Optional property data
  image?: string;
  videoUrl?: string;
  propertyType?: string;
  price?: number;
  /** Stadt/Ort */
  location?: string;
  /** Straße mit Hausnummer */
  address?: string;
  /** Postleitzahl */
  postalCode?: string;
  rooms?: number;
  sqm?: number;

  // Badge variants (only one should be used)
  aiScore?: number;
  statusOnline?: boolean;
  statusPending?: boolean;
  unreadCount?: number;

  // Import indicator
  isImported?: boolean;

  // Stats (for my-properties)
  viewCount?: number;
  favoriteCount?: number;

  // Additional info (for messages)
  roleLabel?: string; // e.g., "Verkäufer" or "Interessent"
  roleValue?: string; // e.g., name or company
  lastMessageDate?: Date;

  // Delete button
  onDelete?: (e: React.MouseEvent) => void;
  deleteTooltip?: string;
}

// Build display location from address, postalCode and location
function buildDisplayLocation(props: { address?: string; postalCode?: string; location?: string }): string {
  // For thumbnails, show abbreviated format: "PLZ Ort" or just "Ort"
  const cityPart = [props.postalCode, props.location].filter(Boolean).join(' ');
  return cityPart || props.location || '';
}

// Memoized component to prevent unnecessary re-renders in lists
export const PropertyListThumbnail = memo(function PropertyListThumbnail({
  id,
  title,
  isSelected,
  onClick,
  image,
  videoUrl,
  propertyType,
  price,
  location,
  address,
  postalCode,
  rooms,
  sqm,
  aiScore,
  statusOnline,
  statusPending,
  unreadCount,
  isImported,
  viewCount,
  favoriteCount,
  roleLabel,
  roleValue,
  lastMessageDate,
  onDelete,
  deleteTooltip = 'Löschen',
}: PropertyListThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  // Build display location with postal code if available
  const displayLocation = buildDisplayLocation({ address, postalCode, location });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all h-36 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Action Buttons - Bottom right, vertical stack */}
      <div className="absolute bottom-2 right-2 z-20 flex flex-col-reverse gap-1.5">
        {/* Delete Button (X) - bottom */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="w-8 h-8 bg-white/80 backdrop-blur-sm text-gray-500 hover:text-gray-700 hover:bg-white rounded-full flex items-center justify-center transition-all shadow-md"
            title={deleteTooltip}
          >
            <X size={18} />
          </button>
        )}
        {/* Unread Badge - above delete */}
        {unreadCount !== undefined && unreadCount > 0 && (
          <div className="w-8 h-8 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md">
            {unreadCount}
          </div>
        )}
      </div>

      <div className="flex h-full cursor-pointer" onClick={onClick}>
        {/* Thumbnail - Full height */}
        <div className="relative w-28 flex-shrink-0 bg-gray-100">
          {image && !imageError ? (
            <Image
              src={image}
              alt={title}
              fill
              sizes="112px"
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : videoUrl ? (
            <video
              src={videoUrl}
              className="w-full h-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <PropertyImagePlaceholder
              className="w-full h-full"
              propertyType={propertyType}
              iconSize={24}
              showLabel={false}
              blur={2}
            />
          )}

          {/* Badge - AI Score (2-stellig, 0-100) - oben rechts */}
          {aiScore !== undefined && aiScore > 0 && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: getScoreColor(toDisplayScore(aiScore)),
                }}
              />
              <span
                className="text-base font-bold leading-none"
                style={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                {Math.round(aiScore)}
              </span>
            </div>
          )}

          {(statusOnline !== undefined || statusPending) && (
            <div
              className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: statusPending ? '#F59E0B' : (statusOnline ? '#22C55E' : '#9CA3AF')
                }}
              />
              <span
                className="text-sm font-bold leading-none"
                style={{
                  color: 'rgba(255, 255, 255, 0.95)',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                }}
              >
                {statusPending ? 'Entwurf' : (statusOnline ? 'Online' : 'Offline')}
              </span>
            </div>
          )}

          {/* Import Badge - oben links */}
          {isImported && (
            <div
              className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
              title="Importiert"
            >
              <Download size={14} className="text-white" />
            </div>
          )}
        </div>

        {/* Info - Unified font sizes */}
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-start">
          {/* Price */}
          {price !== undefined && (
            <p className="text-primary font-bold text-sm">{formatPrice(price)}</p>
          )}

          {/* Title */}
          <h3 className="font-medium text-gray-900 text-sm truncate mt-0.5">{title}</h3>

          {/* Location */}
          {displayLocation && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </p>
          )}

          {/* Role Info (for messages) */}
          {roleLabel && roleValue && (
            <div className="text-xs text-gray-600 mt-1">
              <span className="font-medium">{roleLabel}:</span>{' '}
              <span className="truncate">{roleValue}</span>
            </div>
          )}

          {/* Bottom Row - Property Stats or Date */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {/* Property details */}
            {rooms !== undefined && sqm !== undefined && price !== undefined && (
              <>
                <span>{rooms} Zi.</span>
                <span>•</span>
                <span>{sqm} m²</span>
                <span>•</span>
                <span>{formatPrice(Math.round(price / sqm))}/m²</span>
              </>
            )}

            {/* Stats (views & favorites) */}
            {viewCount !== undefined && favoriteCount !== undefined && (
              <>
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {viewCount}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Heart size={14} />
                  {favoriteCount}
                </span>
              </>
            )}

            {/* Last message date */}
            {lastMessageDate && (
              <span className="flex items-center gap-1">
                <Clock size={12} className="flex-shrink-0" />
                {lastMessageDate.toLocaleDateString('de-DE')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Display name for debugging
PropertyListThumbnail.displayName = 'PropertyListThumbnail';
