'use client';

import React from 'react';

export type AIRating = 'top_deal' | 'good' | 'average' | 'poor' | 'avoid';

interface AIRatingHeroProps {
  rating: AIRating;
  score: number;
  explanation: string;
}

const ratingConfig = {
  top_deal: {
    gradient: 'from-green-500 to-green-600',
    icon: '⭐',
    label: 'Top Deal!',
    textColor: 'text-white',
  },
  good: {
    gradient: 'from-blue-500 to-blue-600',
    icon: '📈',
    label: 'Gutes Angebot',
    textColor: 'text-white',
  },
  average: {
    gradient: 'from-gray-500 to-gray-600',
    icon: '👍',
    label: 'Durchschnittlich',
    textColor: 'text-white',
  },
  poor: {
    gradient: 'from-orange-500 to-orange-600',
    icon: '📉',
    label: 'Eher schlecht',
    textColor: 'text-white',
  },
  avoid: {
    gradient: 'from-red-500 to-red-600',
    icon: '⚠️',
    label: 'Finger weg!',
    textColor: 'text-white',
  },
};

export function AIRatingHero({ rating, score, explanation }: AIRatingHeroProps) {
  const config = ratingConfig[rating];

  return (
    <div className={`bg-gradient-to-br ${config.gradient} rounded-2xl p-6 md:p-8 text-white shadow-xl`}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl md:text-5xl">{config.icon}</span>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{config.label}</h1>
          <p className="text-base md:text-lg opacity-90">KI-Investment-Bewertung</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm md:text-base opacity-90">Investment Score:</span>
          <span className="text-3xl md:text-4xl font-bold">{score}/100</span>
        </div>
        <div className="w-full h-3 md:h-4 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <p className="text-sm md:text-base leading-relaxed opacity-95">
        {explanation}
      </p>
    </div>
  );
}
