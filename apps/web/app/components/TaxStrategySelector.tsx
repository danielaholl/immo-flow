'use client';

import React from 'react';
import { Building2, Sparkles, Landmark, TrendingDown, Clock } from 'lucide-react';

export type AfaStrategy = 'bestand' | 'altbau' | 'neubau' | 'denkmal';

const STRATEGIES: Record<
  AfaStrategy,
  {
    label: string;
    rate: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    avgNote?: string;
  }
> = {
  bestand: {
    label: 'Bestand',
    rate: '2% AfA',
    description: 'Standard für Gebäude nach 1925',
    icon: <Building2 size={20} />,
    color: 'blue',
  },
  altbau: {
    label: 'Altbau',
    rate: '2,5% AfA',
    description: 'Für Gebäude vor 1925',
    icon: <Clock size={20} />,
    color: 'purple',
  },
  neubau: {
    label: 'Neubau',
    rate: '5% Degr. AfA',
    description: 'Aggressive Strategie mit degressiver AfA seit 2024',
    icon: <Sparkles size={20} />,
    color: 'green',
    avgNote: '(Ø 4%)',
  },
  denkmal: {
    label: 'Denkmal-AfA',
    rate: '9% auf Sanier.',
    description: '9% AfA auf Sanierungskosten (~35% des Kaufpreises)',
    icon: <Landmark size={20} />,
    color: 'amber',
  },
};

interface TaxStrategySelectorProps {
  value: AfaStrategy;
  onChange: (strategy: AfaStrategy) => void;
  compact?: boolean;
}

export function TaxStrategySelector({
  value,
  onChange,
  compact = false,
}: TaxStrategySelectorProps) {
  if (compact) {
    // Compact radio button style for sidebar
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Investment Strategie
        </label>
        <div className="space-y-2">
          {(Object.keys(STRATEGIES) as AfaStrategy[]).map((key) => {
            const strategy = STRATEGIES[key];
            const isSelected = value === key;

            return (
              <label
                key={key}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="afa-strategy"
                  value={key}
                  checked={isSelected}
                  onChange={() => onChange(key)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {strategy.label}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {strategy.rate}
                    </span>
                    {strategy.avgNote && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <TrendingDown size={12} />
                        {strategy.avgNote}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Full card style for landing page
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">
        Wähle deine AfA-Strategie
      </label>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(STRATEGIES) as AfaStrategy[]).map((key) => {
          const strategy = STRATEGIES[key];
          const isSelected = value === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`${isSelected ? 'text-primary' : 'text-gray-500'}`}
                >
                  {strategy.icon}
                </span>
                <span className="font-semibold text-gray-900">
                  {strategy.label}
                </span>
              </div>
              <div
                className={`text-lg font-bold mb-1 ${
                  isSelected ? 'text-primary' : 'text-gray-700'
                }`}
              >
                {strategy.rate}
                {strategy.avgNote && (
                  <span className="text-xs font-normal text-gray-500 ml-2 inline-flex items-center gap-1">
                    <TrendingDown size={12} />
                    {strategy.avgNote}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">
                {strategy.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TaxStrategySelector;
