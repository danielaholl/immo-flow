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
      label: 'Top Deal',
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
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderWidth: '1px',
        borderColor: badgeColor,
      }}
    >
      <div
        className="w-3.5 h-3.5 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <div>
        <div
          className="text-[13px] font-bold leading-tight mb-0.5"
          style={{ color: badgeColor }}
        >
          {label}
        </div>
        <div className="text-[11px] font-medium text-white/70">
          {score}/100
        </div>
      </div>
    </div>
  );
}
