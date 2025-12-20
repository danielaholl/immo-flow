'use client';

import { Building2, TrendingUp, Home, Search } from 'lucide-react';

type UserType = 'sucher' | 'investor' | 'verkaeufer' | 'makler';

interface PricingToggleProps {
  value: UserType;
  onChange: (value: UserType) => void;
}

export default function PricingToggle({ value, onChange }: PricingToggleProps) {
  const tabs = [
    { id: 'sucher' as const, label: 'Eigennutzer', icon: Search },
    { id: 'investor' as const, label: 'Investoren', icon: TrendingUp },
    { id: 'verkaeufer' as const, label: 'Verkäufer', icon: Home },
    { id: 'makler' as const, label: 'Makler', icon: Building2 },
  ];

  return (
    <div className="flex justify-center mb-8 px-4">
      <div className="inline-flex bg-gray-100 rounded-xl p-1 flex-wrap justify-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base
              ${
                value === tab.id
                  ? 'bg-white text-gray-900 shadow-md'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <tab.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
