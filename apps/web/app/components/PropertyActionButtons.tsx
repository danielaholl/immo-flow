'use client';

import { useState } from 'react';
import { Heart, X, MessageSquare, Pencil, Power, Share2 } from 'lucide-react';
import { GlassButton, GlassPrimaryButton } from '@rendito/ui';

interface PropertyActionButtonsProps {
  // Mode
  isOwner: boolean;

  // Buyer mode props
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onDismiss?: () => void;
  onStartMessage?: () => void;
  onOpenFeedback?: () => void;

  // Owner mode props
  onEdit?: () => void;
  onDeactivate?: () => void;
  onShare?: () => void;

  // Loading states
  isDismissLoading?: boolean;
  isMessageLoading?: boolean;
  isDeactivateLoading?: boolean;

  // Button labels (optional customization)
  favoriteButtonLabel?: string;

  // Styling
  className?: string;

  // Property URL for buyer share
  propertyUrl?: string;
}

export function PropertyActionButtons({
  isOwner,
  isFavorite = false,
  onToggleFavorite,
  onDismiss,
  onStartMessage,
  onOpenFeedback,
  onEdit,
  onDeactivate,
  onShare,
  isDismissLoading = false,
  isMessageLoading = false,
  isDeactivateLoading = false,
  favoriteButtonLabel,
  className = '',
  propertyUrl,
}: PropertyActionButtonsProps) {
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Handler for buyer share (copy URL)
  const handleBuyerShare = async () => {
    if (!propertyUrl) return;
    try {
      await navigator.clipboard.writeText(propertyUrl);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  // Default favorite button label
  const defaultFavoriteLabel = isFavorite ? 'Favorit' : 'Favorit';
  const finalFavoriteLabel = favoriteButtonLabel || defaultFavoriteLabel;

  if (isOwner) {
    // Owner Mode: Bearbeiten + Teilen + Deaktivieren
    return (
      <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
        <GlassPrimaryButton
          iconLeft={<Pencil />}
          onClick={onEdit}
          fullWidth
          size="lg"
        >
          Bearbeiten
        </GlassPrimaryButton>
        <GlassButton
          iconLeft={<Share2 />}
          onClick={onShare}
          fullWidth
          size="lg"
        >
          Teilen
        </GlassButton>
        <GlassButton
          iconLeft={<Power />}
          onClick={onDeactivate}
          disabled={isDeactivateLoading}
          loading={isDeactivateLoading}
          fullWidth
          size="lg"
        >
          {isDeactivateLoading ? 'Wird deaktiviert...' : 'Deaktivieren'}
        </GlassButton>
      </div>
    );
  }

  // Buyer Mode: 4 Buttons (Favorit, Kein Interesse, Nachricht senden, Teilen)
  return (
    <>
      <div className={`flex flex-wrap gap-3 ${className}`}>
        <div className="flex-1 min-w-[140px]">
          <GlassButton
            iconLeft={<Heart className="text-red-500" fill={isFavorite ? 'currentColor' : 'none'} />}
            onClick={onToggleFavorite}
            fullWidth
            size="lg"
          >
            {finalFavoriteLabel}
          </GlassButton>
        </div>
        <div className="flex-1 min-w-[140px]">
          <GlassButton
            iconLeft={<X />}
            onClick={onDismiss}
            disabled={isDismissLoading}
            loading={isDismissLoading}
            fullWidth
            size="lg"
          >
            {isDismissLoading ? 'Wird verarbeitet...' : 'Kein Interesse'}
          </GlassButton>
        </div>
        <div className="flex-1 min-w-[140px]">
          <GlassButton
            iconLeft={<MessageSquare className="text-green-500" />}
            onClick={onStartMessage}
            disabled={isMessageLoading}
            loading={isMessageLoading}
            fullWidth
            size="lg"
          >
            {isMessageLoading ? 'Wird gestartet...' : 'Nachricht'}
          </GlassButton>
        </div>
        <div className="flex-1 min-w-[140px]">
          <GlassButton
            iconLeft={<Share2 className="text-blue-500" />}
            onClick={handleBuyerShare}
            disabled={!propertyUrl}
            fullWidth
            size="lg"
          >
            Teilen
          </GlassButton>
        </div>
      </div>

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Link kopiert!
        </div>
      )}
    </>
  );
}
