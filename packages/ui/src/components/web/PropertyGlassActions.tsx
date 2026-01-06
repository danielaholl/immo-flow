'use client';

import React from 'react';
import { Heart, MessageSquare, Share2, X } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { formatCount } from '../../utils/formatCount';

export interface PropertyGlassActionsProps {
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
 * Reusable glass action buttons for property cards and detail pages.
 * Order: 1. Favorite (Heart), 2. Message, 3. Share, 4. Dismiss (X)
 */
export function PropertyGlassActions({
  isFavorite = false,
  onFavorite,
  onMessage,
  onShare,
  onDismiss,
  className = '',
  direction = 'vertical',
  favoritesCount,
  conversationsCount,
  sharesCount,
  dismissedCount,
  showCounts = true,
}: PropertyGlassActionsProps) {
  const containerClasses = direction === 'vertical'
    ? `flex flex-col gap-2 ${className}`
    : `flex flex-row gap-2 ${className}`;

  // Format counts
  const formattedFavoritesCount = formatCount(favoritesCount);
  const formattedConversationsCount = formatCount(conversationsCount);
  const formattedSharesCount = formatCount(sharesCount);
  const formattedDismissedCount = formatCount(dismissedCount);

  // Helper to add counter absolutely positioned below icon (2px from icon)
  const ButtonWithCounter = ({
    button,
    count,
  }: {
    button: React.ReactNode;
    count: string;
  }) => {
    if (!showCounts || !count) {
      return <>{button}</>;
    }

    // Wrap button in relative container and position counter absolutely 2px below the icon
    return (
      <div className="relative inline-block">
        {button}
        <span
          className="absolute font-semibold text-white/90 pointer-events-none select-none"
          style={{
            fontSize: 'clamp(0.6rem, 2vw, 0.75rem)',
            textShadow: '0 1px 3px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            marginTop: '14px',
          }}
        >
          {count}
        </span>
      </div>
    );
  };

  return (
    <div className={containerClasses}>
      {/* 1. Favorite (Heart) */}
      <ButtonWithCounter
        count={formattedFavoritesCount}
        button={
          <GlassButton
            variant="favorite"
            iconOnly
            subtleBorder
            iconLeft={<Heart fill={isFavorite ? '#FF385C' : 'none'} strokeWidth={2} />}
            onClick={(e) => onFavorite?.(e as any)}
            tooltip={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            ariaLabel={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          />
        }
      />

      {/* 2. Message */}
      <ButtonWithCounter
        count={formattedConversationsCount}
        button={
          <GlassButton
            variant="default"
            iconOnly
            subtleBorder
            iconLeft={<MessageSquare strokeWidth={2} />}
            onClick={(e) => onMessage?.(e as any)}
            tooltip="Nachricht senden"
            ariaLabel="Nachricht senden"
          />
        }
      />

      {/* 3. Share */}
      <ButtonWithCounter
        count={formattedSharesCount}
        button={
          <GlassButton
            variant="default"
            iconOnly
            subtleBorder
            iconLeft={<Share2 strokeWidth={2} />}
            onClick={(e) => onShare?.(e as any)}
            tooltip="Teilen"
            ariaLabel="Teilen"
          />
        }
      />

      {/* 4. Dismiss (X) */}
      <ButtonWithCounter
        count={formattedDismissedCount}
        button={
          <GlassButton
            variant="default"
            iconOnly
            subtleBorder
            iconLeft={<X strokeWidth={2.5} />}
            onClick={(e) => onDismiss?.(e as any)}
            tooltip="Nicht interessiert"
            ariaLabel="Nicht interessiert"
          />
        }
      />
    </div>
  );
}
