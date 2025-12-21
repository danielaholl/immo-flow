'use client';

import { useState } from 'react';
import { Heart, Crown } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [isLoading, setIsLoading] = useState(false);
  const [showLimitError, setShowLimitError] = useState(false);

  // Get utils for cache invalidation
  const utils = trpc.useContext();

  // Mutations
  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
      utils.favorites.isFavorite.invalidate();
    },
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
      utils.favorites.isFavorite.invalidate();
    },
  });

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isLoading || !userId) return;

    setIsLoading(true);
    setShowLimitError(false);

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync({ propertyId });
        setIsFavorite(false);
        onToggle?.(false);
      } else {
        await addFavoriteMutation.mutateAsync({ propertyId });
        setIsFavorite(true);
        onToggle?.(true);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      // Check if this is a limit error (FORBIDDEN)
      if (error?.data?.code === 'FORBIDDEN') {
        setShowLimitError(true);
        // Auto-hide after 5 seconds
        setTimeout(() => setShowLimitError(false), 5000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push('/pricing');
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

  // Limit error tooltip/toast
  const LimitErrorToast = () => {
    if (!showLimitError) return null;

    return (
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
          <div className="flex items-center gap-2">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Favoriten-Limit erreicht!</span>
          </div>
          <button
            onClick={handleUpgradeClick}
            className="mt-1 text-primary hover:text-primary/80 underline text-xs"
          >
            Jetzt upgraden
          </button>
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    );
  };

  // Large heart style (for overlay on images)
  if (variant === 'overlay' && size === 'lg') {
    return (
      <div className="relative">
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
        <LimitErrorToast />
      </div>
    );
  }

  // Story style (same as overview page - gray fill with white stroke, always 38px like PropertyCard)
  if (variant === 'story') {
    return (
      <div className="relative">
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
        <LimitErrorToast />
      </div>
    );
  }

  // Card style (small badge on property cards)
  if (variant === 'card') {
    return (
      <div className="relative">
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
        <LimitErrorToast />
      </div>
    );
  }

  // Standalone style (regular button)
  return (
    <div className="relative">
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
      <LimitErrorToast />
    </div>
  );
}
