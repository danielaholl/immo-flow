'use client';

import { useRouter } from 'next/navigation';
import { Lock, X } from 'lucide-react';
import { useEffect } from 'react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  action?: string; // e.g., "Zu Favoriten hinzufügen"
  returnUrl?: string;
}

export function LoginPromptModal({
  isOpen,
  onClose,
  title = 'Anmeldung erforderlich',
  message = 'Um diese Funktion zu nutzen, musst du dich anmelden oder ein kostenloses Konto erstellen.',
  action,
  returnUrl,
}: LoginPromptModalProps) {
  const router = useRouter();

  const handleLogin = () => {
    const params = new URLSearchParams();
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    if (action) {
      params.set('action', action);
    }
    router.push(`/login?${params.toString()}`);
  };

  const handleSignup = () => {
    const params = new URLSearchParams();
    if (returnUrl) {
      params.set('returnUrl', returnUrl);
    }
    if (action) {
      params.set('action', action);
    }
    router.push(`/signup?${params.toString()}`);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
        </div>

        {/* Message */}
        <p className="text-base text-gray-600 dark:text-gray-300 mb-4">
          {message}
        </p>

        {/* Action Badge */}
        {action && (
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Du möchtest: {action}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Anmelden
          </button>
          <button
            onClick={handleSignup}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Kostenloses Konto erstellen
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Abbrechen
          </button>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
          Die Registrierung ist komplett kostenlos und dauert nur 30 Sekunden
        </p>
      </div>
    </div>
  );
}
