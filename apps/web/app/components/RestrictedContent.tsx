'use client';

import { Lock, Sparkles, BarChart3, Mail, Images } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface RestrictedContentProps {
  type: 'ai_analysis' | 'statistics' | 'owner_contact' | 'full_images';
  propertyId?: string;
  className?: string;
}

const contentMessages = {
  ai_analysis: {
    title: 'Detaillierte KI-Analyse',
    description: 'Erhalte eine umfassende Investment-Analyse mit Stärken, Schwächen, Chancen, Risiken und Markteinschätzung.',
    icon: Sparkles,
    iconColor: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/10',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  statistics: {
    title: 'Property Statistiken',
    description: 'Sieh dir an, wie oft diese Immobilie angesehen wurde, wie viele Nutzer sie favorisiert haben und wie beliebt sie ist.',
    icon: BarChart3,
    iconColor: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/10',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  owner_contact: {
    title: 'Eigentümer kontaktieren',
    description: 'Stelle Fragen, vereinbare Besichtigungen oder starte eine Unterhaltung direkt mit dem Eigentümer über unser integriertes Messaging-System.',
    icon: Mail,
    iconColor: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/10',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  full_images: {
    title: 'Alle Bilder ansehen',
    description: 'Sieh dir alle verfügbaren Fotos dieser Immobilie in voller Größe und hoher Auflösung an.',
    icon: Images,
    iconColor: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/10',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
};

export function RestrictedContent({ type, propertyId, className = '' }: RestrictedContentProps) {
  const router = useRouter();
  const content = contentMessages[type];
  const Icon = content.icon;

  const handleUnlock = () => {
    const returnUrl = propertyId ? `/properties/${propertyId}` : window.location.pathname;
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}&feature=${type}`);
  };

  return (
    <div
      className={`relative border-2 border-dashed ${content.borderColor} rounded-xl p-8 text-center ${className}`}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white dark:to-gray-900 pointer-events-none rounded-xl" />

      <div className="relative z-10">
        {/* Icon with Lock Badge */}
        <div className={`inline-flex items-center justify-center w-20 h-20 mb-4 ${content.bgColor} rounded-2xl relative`}>
          <Icon className={`w-10 h-10 ${content.iconColor}`} />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
            <Lock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {content.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
          {content.description}
        </p>

        <button
          onClick={handleUnlock}
          className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-md"
        >
          <Lock className="w-4 h-4 mr-2" />
          Jetzt anmelden & freischalten
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
          Kostenlose Registrierung • Keine Kreditkarte erforderlich
        </p>
      </div>
    </div>
  );
}
