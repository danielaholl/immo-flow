'use client';

import React from 'react';

// Helper functions (moved from @immoflow/api to avoid backend dependencies in browser)
function getScoreColorClass(score: number | null | undefined): 'green' | 'yellow' | 'red' | null {
  if (score === null || score === undefined) return null;
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

function getScoreBadgeData(score: number | null | undefined) {
  if (score === null || score === undefined) return null;

  const colorClass = getScoreColorClass(score);
  const labels = {
    green: 'Exzellent',
    yellow: 'Moderat',
    red: 'Risiko',
  };

  return {
    score,
    colorClass,
    label: colorClass ? labels[colorClass] : null,
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
 * Green (70-100): Excellent investment
 * Yellow (40-69): Moderate investment
 * Red (0-39): Risky investment
 *
 * @deprecated Use PropertyScoreBadge from @immoflow/ui instead.
 * PropertyScoreBadge provides a unified badge component with consistent design
 * and thresholds across the entire application.
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

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${colorClass} ${sizeClasses[size]} ${className}`}
      title={`Investment-Score: ${scoreValue}/100 - ${label}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{scoreValue}</span>
      {showLabel && <span className="font-normal">/ 100</span>}
    </div>
  );
}

/**
 * @deprecated Use AIInvestmentEvaluation from @immoflow/ui instead
 * This component has been replaced by a unified AIInvestmentEvaluation component
 * that includes all features plus AI analysis texts and better configurability.
 */
