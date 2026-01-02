'use client';

import { ArrowLeft } from 'lucide-react';

interface MobileDetailHeaderProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  showOnDesktop?: boolean;
  showTitle?: boolean;
}

export function MobileDetailHeader({ title, subtitle, onBack, showOnDesktop = false, showTitle = true }: MobileDetailHeaderProps) {
  return (
    <div className={`${showOnDesktop ? '' : 'lg:hidden'} bg-white/80 dark:bg-[#030712]/80 backdrop-blur-md sticky top-0 z-50`}>
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onBack}
          className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Zurück zur Liste"
        >
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
        {showTitle && (
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
