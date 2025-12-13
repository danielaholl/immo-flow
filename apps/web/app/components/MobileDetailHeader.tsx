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
    <div className={`${showOnDesktop ? '' : 'lg:hidden'} bg-white border-b border-gray-200`}>
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={onBack}
          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Zurück zur Liste"
        >
          <ArrowLeft size={24} className="text-gray-900" />
        </button>
        {showTitle && (
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{title}</h2>
            {subtitle && (
              <p className="text-sm text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
