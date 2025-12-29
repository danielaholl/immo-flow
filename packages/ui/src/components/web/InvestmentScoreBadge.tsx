'use client';

import React from 'react';

// Score von 0-100 auf 1-5 konvertieren
function toDisplayScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

// Helper functions
// 1-5 Skala: 5=top, 4=gut, 3=ok, 2=schwach, 1=nein
function getScoreColorClass(score: number | null | undefined): 'green' | 'yellow' | 'red' | null {
  if (score === null || score === undefined) return null;
  const displayScore = toDisplayScore(score);
  if (displayScore >= 4) return 'green';
  if (displayScore === 3) return 'yellow';
  return 'red';
}

function getScoreBadgeData(score: number | null | undefined) {
  if (score === null || score === undefined) return null;

  const displayScore = toDisplayScore(score);
  const colorClass = getScoreColorClass(score);

  const labels: Record<number, string> = {
    5: 'Top',
    4: 'Gut',
    3: 'OK',
    2: 'Schwach',
    1: 'Nein',
  };

  return {
    score: displayScore,
    colorClass,
    label: labels[displayScore] || null,
  };
}

interface InvestmentScoreBadgeProps {
  score: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Display AI investment score with color-coded badge
 * Anzeige: 1-5 Skala (intern 0-100)
 * 5 = top, 4 = gut, 3 = ok, 2 = schwach, 1 = nein
 *
 * @deprecated Use PropertyScoreBadge from @rendito/ui instead.
 */
export function InvestmentScoreBadge({
  score,
  size = 'md',
  showLabel = true,
  className = '',
}: InvestmentScoreBadgeProps) {
  const badgeData = getScoreBadgeData(score);

  if (!badgeData) {
    return null;
  }

  const { score: scoreValue, colorClass, label } = badgeData;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Icon based on colorClass
  const icon = colorClass ? {
    green: '✓',
    yellow: '◐',
    red: '!',
  }[colorClass] : null;

  // 2-stelliger Score (0-100)
  const twoDigitScore = score !== null && score !== undefined ? Math.round(score) : 0;

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${colorClass} ${sizeClasses[size]} ${className}`}
      title={`Investment-Score: ${twoDigitScore} - ${label}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{twoDigitScore}</span>
    </div>
  );
}

/**
 * @deprecated Use AIInvestmentEvaluation from @rendito/ui instead
 * This component has been replaced by a unified AIInvestmentEvaluation component
 * that includes all features plus AI analysis texts and better configurability.
 */
