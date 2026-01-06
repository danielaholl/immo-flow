'use client';

import React from 'react';
import { Heart, MessageSquare, Share2, X } from 'lucide-react';
import { ImageOverlayButton } from './ImageOverlayButton';

export interface ImageOverlayActionsProps {
  /** Whether the property is favorited */
  isFavorite?: boolean;
  /** Handler for favorite toggle */
  onFavorite?: (e: React.MouseEvent) => void;
  /** Handler for message action */
  onMessage?: (e: React.MouseEvent) => void;
  /** Handler for share action */
  onShare?: (e: React.MouseEvent) => void;
  /** Handler for dismiss action */
  onDismiss?: (e: React.MouseEvent) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Direction of the button layout */
  direction?: 'vertical' | 'horizontal';
  /** Size of the buttons */
  size?: 'sm' | 'md' | 'lg' | 'responsive';

  // Interaction counts (Instagram/TikTok style)
  /** Number of favorites */
  favoritesCount?: number;
  /** Number of conversations */
  conversationsCount?: number;
  /** Number of shares */
  sharesCount?: number;
  /** Number of dismissed */
  dismissedCount?: number;
  /** Whether to show counters (default: true) */
  showCounts?: boolean;
}

/**
 * Transparent glass action buttons for image overlays.
 * Uses the old transparent style optimized for use on images.
 * Order: 1. Favorite (Heart), 2. Message, 3. Share, 4. Dismiss (X)
 */
export function ImageOverlayActions({
  isFavorite = false,
  onFavorite,
  onMessage,
  onShare,
  onDismiss,
  className = '',
  direction = 'vertical',
  size = 'md',
  favoritesCount,
  conversationsCount,
  sharesCount,
  dismissedCount,
  showCounts = true,
}: ImageOverlayActionsProps) {
  const containerClasses = direction === 'vertical'
    ? `flex flex-col gap-2 ${className}`
    : `flex flex-row gap-2 ${className}`;

  return (
    <div className={containerClasses}>
      {/* 1. Favorite (Heart) */}
      <ImageOverlayButton
        variant="favorite"
        size={size}
        icon={<Heart fill={isFavorite ? '#FF385C' : 'none'} strokeWidth={2} />}
        onClick={(e) => onFavorite?.(e as any)}
        tooltip={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        ariaLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
        count={favoritesCount}
        showCount={showCounts}
      />

      {/* 2. Message */}
      <ImageOverlayButton
        variant="default"
        size={size}
        icon={<MessageSquare strokeWidth={2} />}
        onClick={(e) => onMessage?.(e as any)}
        tooltip="Nachricht senden"
        ariaLabel="Nachricht senden"
        count={conversationsCount}
        showCount={showCounts}
      />

      {/* 3. Share */}
      <ImageOverlayButton
        variant="default"
        size={size}
        icon={<Share2 strokeWidth={2} />}
        onClick={(e) => onShare?.(e as any)}
        tooltip="Teilen"
        ariaLabel="Teilen"
        count={sharesCount}
        showCount={showCounts}
      />

      {/* 4. Dismiss (X) */}
      {onDismiss && (
        <ImageOverlayButton
          variant="default"
          size={size}
          icon={<X strokeWidth={2.5} />}
          onClick={(e) => onDismiss?.(e as any)}
          tooltip="Nicht interessiert"
          ariaLabel="Nicht interessiert"
          count={dismissedCount}
          showCount={showCounts}
        />
      )}
    </div>
  );
}
