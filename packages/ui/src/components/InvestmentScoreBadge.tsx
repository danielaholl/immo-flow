'use client';

import React from 'react';
import { getScoreBadgeData, getScoreColorClass } from '@immoflow/api';

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

  const { score: scoreValue, color, label } = badgeData;
  const colorClass = getScoreColorClass(color);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Icon based on color
  const icon = {
    green: '✓',
    yellow: '◐',
    red: '!',
  }[color];

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

interface InvestmentScoreCardProps {
  score: number | null | undefined;
  breakdown?: {
    location_score: number;
    price_score: number;
    yield_score: number;
    appreciation_score: number;
    features_score: number;
  };
  metrics?: {
    price_per_sqm: number;
    estimated_monthly_rent: number;
    gross_yield_percentage: number;
  };
  className?: string;
}

/**
 * Detailed investment score card with breakdown
 */
export function InvestmentScoreCard({
  score,
  breakdown,
  metrics,
  className = '',
}: InvestmentScoreCardProps) {
  const badgeData = getScoreBadgeData(score);

  if (!badgeData) {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <p className="text-gray-500 text-center">Noch keine Bewertung verfügbar</p>
      </div>
    );
  }

  const { score: scoreValue, color, label } = badgeData;

  const getBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Investment-Bewertung</h3>
          <p className="text-sm text-gray-500">KI-gestützte Analyse</p>
        </div>
        <InvestmentScoreBadge score={score} size="lg" showLabel={false} />
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">{scoreValue} / 100</span>
          <span className={`text-sm font-semibold ${
            color === 'green' ? 'text-green-600' :
            color === 'yellow' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {label}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor(scoreValue)} transition-all duration-500`}
            style={{ width: `${scoreValue}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      {breakdown && (
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-700">Bewertungs-Details</h4>

          {[
            { label: 'Lage', score: breakdown.location_score, weight: '30%' },
            { label: 'Preis', score: breakdown.price_score, weight: '25%' },
            { label: 'Rendite', score: breakdown.yield_score, weight: '25%' },
            { label: 'Wertsteigerung', score: breakdown.appreciation_score, weight: '15%' },
            { label: 'Ausstattung', score: breakdown.features_score, weight: '5%' },
          ].map(({ label, score: itemScore, weight }) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {label} <span className="text-gray-400">({weight})</span>
                </span>
                <span className="font-semibold text-gray-900">{itemScore}/100</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getBarColor(itemScore)} transition-all duration-300`}
                  style={{ width: `${itemScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="border-t pt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Kennzahlen</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Preis/m²</p>
              <p className="font-semibold text-gray-900">
                {metrics.price_per_sqm.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
              </p>
            </div>
            <div>
              <p className="text-gray-500">Geschätzte Miete</p>
              <p className="font-semibold text-gray-900">
                {metrics.estimated_monthly_rent.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €/Monat
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Brutto-Mietrendite</p>
              <p className="font-semibold text-gray-900">
                {metrics.gross_yield_percentage.toFixed(2)}% p.a.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t pt-4 mt-4">
        <p className="text-xs text-gray-400 text-center">
          Bewertung basiert auf KI-Analyse und Marktdaten. Keine Anlageberatung.
        </p>
      </div>
    </div>
  );
}
