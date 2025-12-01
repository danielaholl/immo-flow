'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { addFavorite, removeFavorite, trackInteraction, updateUserPreferences } from '@immoflow/api';

interface FavoriteButtonProps {
  userId: string;
  propertyId: string;
  isFavorite: boolean;
  onToggle?: (newState: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'overlay' | 'card' | 'standalone' | 'story';
  className?: string;
}

export function FavoriteButton({
  userId,
  propertyId,
  isFavorite: initialIsFavorite,
  onToggle,
  size = 'md',
  variant = 'overlay',
  className = '',
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || !userId) return;

    setIsLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(userId, propertyId);
        setIsFavorite(false);
        onToggle?.(false);

        // Track unfavorite interaction
        trackInteraction(userId, propertyId, 'unfavorite', {
          source: variant,
        }).catch((err) => console.error('Error tracking unfavorite:', err));
      } else {
        await addFavorite({ user_id: userId, property_id: propertyId });
        setIsFavorite(true);
        onToggle?.(true);

        // Track favorite interaction
        trackInteraction(userId, propertyId, 'favorite', {
          source: variant,
        }).catch((err) => console.error('Error tracking favorite:', err));

        // Update user preferences in background (non-blocking)
        updateUserPreferences(userId).catch((err) => {
          console.error('Error updating user preferences:', err);
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: {
      button: 'p-1.5',
      icon: 12,
    },
    md: {
      button: 'p-2',
      icon: 16,
    },
    lg: {
      button: 'text-4xl',
      icon: 24,
    },
  };

  const currentSize = sizeClasses[size];

  // Large heart style (for overlay on images)
  if (variant === 'overlay' && size === 'lg') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`z-10 transition-transform hover:scale-110 disabled:opacity-50 ${className}`}
        style={{
          color: isFavorite ? '#FF385C' : 'rgba(60, 60, 60, 0.7)',
          WebkitTextStroke: '2px white',
          fontSize: '36px',
        }}
        aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      >
        ♥
      </button>
    );
  }

  // Story style (same as overview page - gray fill with white stroke, always 38px like PropertyCard)
  if (variant === 'story') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`z-10 transition-transform hover:scale-110 disabled:opacity-50 ${className}`}
        style={{
          color: isFavorite ? '#FF385C' : 'rgba(60, 60, 60, 0.7)',
          WebkitTextStroke: '2px white',
          fontSize: '38px',
        }}
        aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      >
        ♥
      </button>
    );
  }

  // Card style (small badge on property cards)
  if (variant === 'card') {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`rounded-full bg-white/90 hover:bg-white transition-all hover:scale-110 disabled:opacity-50 ${currentSize.button} ${className}`}
        aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      >
        <Heart
          size={currentSize.icon}
          className={isFavorite ? 'text-primary fill-primary' : 'text-gray-400'}
        />
      </button>
    );
  }

  // Standalone style (regular button)
  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`rounded-full transition-all hover:scale-110 disabled:opacity-50 ${currentSize.button} ${className}`}
      aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
    >
      <Heart
        size={currentSize.icon}
        className={isFavorite ? 'text-primary fill-primary' : 'text-gray-400 hover:text-primary'}
      />
    </button>
  );
}
