'use client';

import { useAuthContext } from '@/app/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UseAuthGuardOptions {
  /** Redirect to login if not authenticated */
  redirectToLogin?: boolean;
  /** Show modal instead of redirect */
  showModal?: boolean;
  /** Message to show in modal/after redirect */
  message?: string;
  /** URL to return to after login */
  returnUrl?: string;
}

export function useAuthGuard(options: UseAuthGuardOptions = {}) {
  const { user, loading: isLoading } = useAuthContext();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    fn: () => void;
    description?: string;
  } | null>(null);

  /**
   * Guard a function - only execute if authenticated
   * Otherwise show modal or redirect
   */
  const guard = <T extends any[]>(
    action: (...args: T) => void,
    customMessage?: string
  ) => {
    return (...args: T) => {
      if (isLoading) return;

      if (!user) {
        const message = customMessage || options.message || 'Bitte melde dich an, um fortzufahren.';

        // Store action to execute after login
        setPendingAction({
          fn: () => action(...args),
          description: customMessage
        });

        if (options.showModal !== false) {
          // Show modal by default
          setShowLoginModal(true);
        } else if (options.redirectToLogin) {
          // Or redirect to login
          const returnUrl = options.returnUrl || window.location.pathname;
          router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&message=${encodeURIComponent(message)}`);
        }

        return;
      }

      // User is authenticated, execute action
      action(...args);
    };
  };

  /**
   * Execute pending action after successful login
   */
  const executePendingAction = () => {
    if (pendingAction) {
      pendingAction.fn();
      setPendingAction(null);
    }
    setShowLoginModal(false);
  };

  /**
   * Clear pending action
   */
  const clearPendingAction = () => {
    setPendingAction(null);
    setShowLoginModal(false);
  };

  return {
    guard,
    showLoginModal,
    setShowLoginModal,
    isAuthenticated: !!user,
    isLoading,
    executePendingAction,
    clearPendingAction,
    pendingActionExists: !!pendingAction,
    pendingActionDescription: pendingAction?.description,
  };
}
