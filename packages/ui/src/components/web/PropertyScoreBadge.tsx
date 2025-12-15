/**
 * PropertyScoreBadge Component
 * Einheitlicher Badge für AI Investment Score mit offiziellen Schwellenwerten
 *
 * Schwellenwerte (aus evaluation.ts):
 * - 🟢 Grün: >= 70 (Exzellente Investition)
 * - 🟡 Gelb: >= 40 (Moderate Investition)
 * - 🔴 Rot: < 40 (Risikoreich)
 */

import React from 'react';

interface PropertyScoreBadgeProps {
  score: number;
  variant?: 'overlay' | 'inline';
}

// Offizielle Schwellenwerte aus /apps/api/src/constants/evaluation.ts
const COLOR_RATING_THRESHOLDS = {
  green: 70,
  yellow: 40,
} as const;

interface BadgeInfo {
  label: string;
  badgeColor: string;
  dotColor: string;
}

function getBadgeInfo(score: number): BadgeInfo {
  if (score >= COLOR_RATING_THRESHOLDS.green) {
    return {
      label: 'Excellent',
      badgeColor: '#22C55E', // green-500
      dotColor: '#22C55E',
    };
  } else if (score >= COLOR_RATING_THRESHOLDS.yellow) {
    return {
      label: 'Moderat',
      badgeColor: '#F59E0B', // amber-500
      dotColor: '#F59E0B',
    };
  } else {
    return {
      label: 'Risiko',
      badgeColor: '#EF4444', // red-500
      dotColor: '#EF4444',
    };
  }
}

export function PropertyScoreBadge({ score, variant = 'overlay' }: PropertyScoreBadgeProps) {
  const { label, badgeColor, dotColor } = getBadgeInfo(score);

  return (
    <div
      className="flex flex-col items-center px-3 py-2 rounded-lg"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Label */}
      <div
        className="text-[11px] font-bold leading-none mb-1"
        style={{
          color: badgeColor,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {label}
      </div>
      {/* Dot + Score Row */}
      <div className="flex items-center gap-1.5">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{
            backgroundColor: dotColor,
          }}
        />
        <div
          className="text-[20px] font-bold leading-none"
          style={{
            color: 'rgba(255, 255, 255, 0.95)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          }}
        >
          {score}
        </div>
      </div>
    </div>
  );
}
