import { useState } from 'react';
import { Home, MapPin, Eye, Heart, Clock, X } from 'lucide-react';

export interface PropertyListThumbnailProps {
  // Required
  id: string;
  title: string;
  isSelected: boolean;
  onClick: () => void;

  // Optional property data
  image?: string;
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
  unreadCount?: number;

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

export function PropertyListThumbnail({
  id,
  title,
  isSelected,
  onClick,
  image,
  price,
  location,
  address,
  postalCode,
  rooms,
  sqm,
  aiScore,
  statusOnline,
  unreadCount,
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
      className={`group relative bg-white border rounded-xl overflow-hidden transition-all h-44 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Delete Button (X) - Always visible if onDelete provided */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 z-20 w-8 h-8 text-gray-500 hover:text-gray-700 rounded-full flex items-center justify-center transition-all"
          title={deleteTooltip}
        >
          <X size={20} />
        </button>
      )}

      {/* Unread Badge - Below delete button */}
      {unreadCount !== undefined && unreadCount > 0 && (
        <div className="absolute top-10 right-2 z-20 bg-blue-500 text-white text-xs font-bold rounded-full px-2 py-1 shadow-md">
          {unreadCount}
        </div>
      )}

      <div className="flex h-full cursor-pointer" onClick={onClick}>
        {/* Thumbnail - Full height */}
        <div className="relative w-28 flex-shrink-0 bg-gray-100">
          {image && !imageError ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home size={32} className="text-gray-300" />
            </div>
          )}

          {/* Badge - AI Score, Status, etc. */}
          {aiScore !== undefined && aiScore > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/75 shadow-md">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: aiScore >= 70 ? '#22C55E' : aiScore >= 40 ? '#F59E0B' : '#EF4444'
                }}
              />
              <span className="text-white text-xs font-semibold">{aiScore}</span>
            </div>
          )}

          {statusOnline !== undefined && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/75 shadow-md">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: statusOnline ? '#22C55E' : '#9CA3AF'
                }}
              />
              <span className="text-white text-xs font-semibold">
                {statusOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
        </div>

        {/* Info - Unified font sizes */}
        <div className="flex-1 p-3 min-w-0 flex flex-col justify-start">
          {/* Price */}
          {price !== undefined && (
            <p className="text-primary font-bold text-base">{formatPrice(price)}</p>
          )}

          {/* Title */}
          <h3 className="font-medium text-gray-900 text-base truncate mt-0.5">{title}</h3>

          {/* Location */}
          {displayLocation && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 truncate">
              <MapPin size={12} className="flex-shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </p>
          )}

          {/* Role Info (for messages) */}
          {roleLabel && roleValue && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">{roleLabel}:</span>{' '}
              <span className="truncate">{roleValue}</span>
            </div>
          )}

          {/* Bottom Row - Property Stats or Date */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
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
}
