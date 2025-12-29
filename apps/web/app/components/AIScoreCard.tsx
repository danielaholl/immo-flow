'use client';

import { Brain, Sparkles } from 'lucide-react';

interface AIScoreCardProps {
  score: number;
  propertyTitle: string;
  description?: string;
  factors: {
    location: number;
    pricePerformance: number;
    appreciation: number;
    rentability: number;
  };
}

// Circular progress component
function CircularProgress({ score, size = 120 }: { score: number; size?: number }) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  // Color based on score
  const getColor = () => {
    if (score > 80) return { stroke: '#10B981', bg: '#D1FAE5' }; // emerald
    if (score >= 40) return { stroke: '#F59E0B', bg: '#FEF3C7' }; // amber
    return { stroke: '#EF4444', bg: '#FEE2E2' }; // rose
  };

  const colors = getColor();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{score}</span>
      </div>
    </div>
  );
}

// Progress bar card for factors with fixed colors per category
type FactorType = 'location' | 'pricePerformance' | 'appreciation' | 'rentability';

function FactorCard({ label, score, type }: { label: string; score: number; type: FactorType }) {
  const colorMap: Record<FactorType, { bar: string; text: string }> = {
    location: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    pricePerformance: { bar: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    appreciation: { bar: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
    rentability: { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  };

  const colors = colorMap[type];

  return (
    <div className="rounded-xl p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`text-sm font-bold ${colors.text}`}>{score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function AIScoreCard({ score, propertyTitle, description, factors }: AIScoreCardProps) {
  // Rating text based on score
  const getRatingText = () => {
    if (score > 80) return 'Sehr empfehlenswert';
    if (score >= 60) return 'Empfehlenswert';
    if (score >= 40) return 'Bedingt empfehlenswert';
    return 'Nicht empfehlenswert';
  };

  const getRatingColor = () => {
    if (score > 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  // Default description if none provided
  const displayDescription = description ||
    `Diese Immobilie zeigt ein ${score > 80 ? 'überdurchschnittliches' : score >= 60 ? 'solides' : 'moderates'} Investment-Potential. ` +
    `Die Kombination aus ${factors.location > 70 ? 'Top-Lage' : 'guter Lage'}, ` +
    `${factors.pricePerformance > 70 ? 'attraktivem Preis-Leistungs-Verhältnis' : 'fairem Preis'} und ` +
    `${factors.rentability > 70 ? 'starker Vermietbarkeit' : 'solider Vermietbarkeit'} ` +
    `macht sie zu einer ${score > 80 ? 'hervorragenden' : score >= 60 ? 'interessanten' : 'zu prüfenden'} Kapitalanlage.`;

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* AI Analyse Card */}
      <div className={`rounded-xl overflow-hidden p-5 sm:p-6 flex-1 ${
        score > 80
          ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
          : score >= 40
            ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700'
            : 'bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-700'
      }`}>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Investment Score</p>

        {/* Score Display with Brain Icon */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-5xl font-bold text-gray-900 dark:text-white">{score}</p>
            <p className={`text-sm font-semibold mt-1 ${getRatingColor()}`}>
              {getRatingText()}
            </p>
          </div>

          {/* Brain Icon Circle - larger with gradient */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br ${
            score > 80
              ? 'from-emerald-500 to-emerald-100 dark:to-emerald-900'
              : score >= 40
                ? 'from-amber-500 to-amber-100 dark:to-amber-900'
                : 'from-rose-500 to-rose-100 dark:to-rose-900'
          }`}>
            <Brain size={40} className="text-black dark:text-white" />
          </div>
        </div>

        {/* Description with Sparkles icon */}
        <div className="flex items-start gap-2">
          <Sparkles size={16} className={`mt-0.5 flex-shrink-0 ${
            score > 80 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500'
          }`} />
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {displayDescription}
          </p>
        </div>
      </div>

      {/* Bewertungsfaktoren */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h4 className="font-semibold text-gray-900 dark:text-white text-base mb-3">Bewertungsfaktoren</h4>
        <div className="space-y-3">
          <FactorCard label="Lage & Mikrolage" score={factors.location} type="location" />
          <FactorCard label="Preis-Leistung" score={factors.pricePerformance} type="pricePerformance" />
          <FactorCard label="Wertsteigerung" score={factors.appreciation} type="appreciation" />
          <FactorCard label="Vermietbarkeit" score={factors.rentability} type="rentability" />
        </div>
      </div>
    </div>
  );
}
