'use client';

import { useState } from 'react';
import { Heart, X, MessageSquare, Pencil, Power, Share2 } from 'lucide-react';

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
          <button
            onClick={onEdit}
            className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            <Pencil size={20} />
            Bearbeiten
          </button>
          <button
            onClick={onShare}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Teilen
          </button>
          <button
            onClick={onDeactivate}
            disabled={isDeactivateLoading}
            className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeactivateLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Wird deaktiviert...
              </>
            ) : (
              <>
                <Power size={20} />
                Deaktivieren
              </>
            )}
          </button>
      </div>
    );
  }

  // Buyer Mode: 4 Buttons (Favorit, Kein Interesse, Nachricht senden, Teilen)
  return (
    <>
      <div className={`flex flex-wrap gap-3 ${className}`}>
          <button
            onClick={onToggleFavorite}
            className={`flex-1 min-w-[140px] font-semibold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 ${
              isFavorite
                ? 'bg-primary text-white hover:opacity-90'
                : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
            <span className="truncate">{finalFavoriteLabel}</span>
          </button>
          <button
            onClick={onDismiss}
            disabled={isDismissLoading}
            className="flex-1 min-w-[140px] bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDismissLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                <span className="truncate">Wird verarbeitet...</span>
              </>
            ) : (
              <>
                <X size={20} />
                <span className="truncate">Kein Interesse</span>
              </>
            )}
          </button>
          <button
            onClick={onStartMessage}
            disabled={isMessageLoading}
            className="flex-1 min-w-[140px] bg-green-600 text-white font-semibold py-4 px-4 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isMessageLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="truncate">Wird gestartet...</span>
              </>
            ) : (
              <>
                <MessageSquare size={20} />
                <span className="truncate">Nachricht</span>
              </>
            )}
          </button>
          <button
            onClick={handleBuyerShare}
            disabled={!propertyUrl}
            className="flex-1 min-w-[140px] bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 size={20} />
            <span className="truncate">Teilen</span>
          </button>
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
