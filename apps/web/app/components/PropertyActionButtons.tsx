'use client';

import { Heart, X, MessageSquare, Pencil, Power } from 'lucide-react';

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

  // Loading states
  isDismissLoading?: boolean;
  isMessageLoading?: boolean;
  isDeactivateLoading?: boolean;

  // Button labels (optional customization)
  favoriteButtonLabel?: string;

  // Styling
  className?: string;
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
  isDismissLoading = false,
  isMessageLoading = false,
  isDeactivateLoading = false,
  favoriteButtonLabel,
  className = '',
}: PropertyActionButtonsProps) {
  // Default favorite button label
  const defaultFavoriteLabel = isFavorite ? 'Favorit' : 'Favorit';
  const finalFavoriteLabel = favoriteButtonLabel || defaultFavoriteLabel;
  if (isOwner) {
    // Owner Mode: Bearbeiten + Deaktivieren
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

  // Buyer Mode: 3 Buttons in einer Reihe (responsiv)
  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
        <button
          onClick={onToggleFavorite}
          className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 ${
            isFavorite
              ? 'bg-primary text-white hover:opacity-90'
              : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
          {finalFavoriteLabel}
        </button>
        <button
          onClick={onDismiss}
          disabled={isDismissLoading}
          className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDismissLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Wird verarbeitet...
            </>
          ) : (
            <>
              <X size={20} />
              Kein Interesse
            </>
          )}
        </button>
        <button
          onClick={onStartMessage}
          disabled={isMessageLoading}
          className="flex-1 bg-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMessageLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Wird gestartet...
            </>
          ) : (
            <>
              <MessageSquare size={20} />
              Nachricht senden
            </>
          )}
        </button>
    </div>
  );
}
