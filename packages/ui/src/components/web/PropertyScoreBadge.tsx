/**
 * PropertyScoreBadge Component
 * Einheitlicher Badge für AI Investment Score
 *
 * Anzeige: 1-5 Skala (intern 0-100)
 * - 5 = top / sofort interessant (>= 80)
 * - 4 = gut / sehr prüfenswert (>= 60)
 * - 3 = ok / nur bei gutem Preis (>= 40)
 * - 2 = schwach / nur Spezialfall (>= 20)
 * - 1 = nein (< 20)
 */

import React from 'react';

interface PropertyScoreBadgeProps {
  /** Score auf 0-100 Skala (wird als 1-5 angezeigt) */
  score: number;
  variant?: 'overlay' | 'inline';
}

// Score von 0-100 auf 1-5 konvertieren
function toDisplayScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

interface BadgeInfo {
  label: string;
  badgeColor: string;
  dotColor: string;
}

function getBadgeInfo(displayScore: number): BadgeInfo {
  if (displayScore >= 4) {
    // 4-5: grün (gut/top)
    return {
      label: displayScore === 5 ? 'Top' : 'Gut',
      badgeColor: '#22C55E',
      dotColor: '#22C55E',
    };
  } else if (displayScore === 3) {
    // 3: gelb (ok)
    return {
      label: 'OK',
      badgeColor: '#F59E0B',
      dotColor: '#F59E0B',
    };
  } else {
    // 1-2: rot (schwach/nein)
    return {
      label: displayScore === 2 ? 'Schwach' : 'Nein',
      badgeColor: '#EF4444',
      dotColor: '#EF4444',
    };
  }
}

export function PropertyScoreBadge({ score, variant = 'overlay' }: PropertyScoreBadgeProps) {
  const displayScore = toDisplayScore(score);
  const { dotColor } = getBadgeInfo(displayScore);

  return (
    <div
      className="w-[52px] h-[52px] rounded-full flex items-center justify-center"
      style={{
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        border: `1px solid ${dotColor}`,
      }}
    >
      {/* Score */}
      <div
        className="text-[28px] font-bold leading-none"
        style={{
          color: dotColor,
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        }}
      >
        {displayScore}
      </div>
    </div>
  );
}
