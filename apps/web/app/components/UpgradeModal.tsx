'use client';

import { X, Crown, Check, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSubscription, PlanType } from '../../hooks/useSubscription';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan?: PlanType;
}

const featureMessages: Record<string, { title: string; description: string }> = {
  ai_analysis: {
    title: 'KI-Analyse freischalten',
    description: 'Erhalte detaillierte Investment-Analysen mit SWOT, Rendite-Prognosen und Markteinschätzungen.',
  },
  unlimited_favorites: {
    title: 'Unbegrenzte Favoriten',
    description: 'Speichere beliebig viele Immobilien in deinen Favoriten.',
  },
  portfolio_overview: {
    title: 'Portfolio-Übersicht',
    description: 'Verwalte dein komplettes Immobilien-Portfolio an einem Ort.',
  },
  pdf_export: {
    title: 'PDF-Export',
    description: 'Exportiere Analysen und Exposés als professionelle PDFs.',
  },
  default: {
    title: 'Premium Feature',
    description: 'Dieses Feature ist nur mit einem kostenpflichtigen Plan verfügbar.',
  },
};

const planFeatures: Record<PlanType, string[]> = {
  free: [],
  sucher: [
    'Unbegrenzte Favoriten',
    'Budget-Suche',
    'KI-Preis-Check',
    'Nebenkosten-Rechner',
  ],
  investor: [
    'Alles aus Sucher',
    'Unbegrenzte KI-Analysen',
    'SWOT-Analyse',
    'Rendite-Kalkulator',
    'Finanzierungsrechner',
  ],
  pro: [
    'Alles aus Investor',
    'Portfolio-Übersicht',
    'PDF-Export',
    'Investoren-Club',
    'Priority Support',
  ],
  makler_pro: [],
  makler_enterprise: [],
  verkauf_starter: [],
  verkauf_premium: [],
};

const planPrices: Record<PlanType, number> = {
  free: 0,
  sucher: 9,
  investor: 29,
  pro: 79,
  makler_pro: 99,
  makler_enterprise: 249,
  verkauf_starter: 99,
  verkauf_premium: 249,
};

const planNames: Record<PlanType, string> = {
  free: 'Free',
  sucher: 'Sucher',
  investor: 'Investor',
  pro: 'Pro',
  makler_pro: 'Makler Pro',
  makler_enterprise: 'Makler Enterprise',
  verkauf_starter: 'Verkauf Starter',
  verkauf_premium: 'Verkauf Premium',
};

export function UpgradeModal({ isOpen, onClose, feature, requiredPlan = 'investor' }: UpgradeModalProps) {
  const router = useRouter();
  const { plan: currentPlan, checkout, isCheckoutLoading } = useSubscription();

  if (!isOpen) return null;

  const message = featureMessages[feature] || featureMessages.default;
  const features = planFeatures[requiredPlan] || [];

  const handleUpgrade = async () => {
    if (requiredPlan === 'free') return;
    try {
      await checkout(requiredPlan);
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  const handleViewPricing = () => {
    onClose();
    router.push('/pricing');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary to-purple-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">{message.title}</h2>
          </div>
          <p className="text-white/80 text-sm">{message.description}</p>
        </div>

        {/* Plan details */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Empfohlener Plan</span>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                {planNames[requiredPlan]}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">
                {planPrices[requiredPlan]}€
              </span>
              <span className="text-gray-500 dark:text-gray-400">/Monat</span>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-2 mb-6">
            {features.map((feat, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{feat}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={isCheckoutLoading}
              className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCheckoutLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Wird geladen...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4" />
                  Jetzt upgraden
                </>
              )}
            </button>

            <button
              onClick={handleViewPricing}
              className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Alle Pläne vergleichen
            </button>
          </div>

          {/* Current plan indicator */}
          {currentPlan !== 'free' && (
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              Dein aktueller Plan: <span className="font-medium">{planNames[currentPlan]}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
