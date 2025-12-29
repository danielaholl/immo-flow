/**
 * PropertyScoreBadge Component
 * Einheitlicher Badge für AI Investment Score
 *
 * Schwellenwerte:
 * - 85-100: hell leuchtendes grün (Sehr gut)
 * - 60-84: grün (Gut)
 * - 40-59: gelb (OK)
 * - <40: rot (Schwach)
 *
 * Varianten:
 * - overlay: Klassisches Badge mit Icon + Text
 * - ring: Apple Watch Style Progress-Ring
 */

import React from 'react';
import { Brain } from 'lucide-react';

interface PropertyScoreBadgeProps {
  /** Score auf 0-100 Skala */
  score: number;
  variant?: 'overlay' | 'inline' | 'ring';
  /** Größe des Badges (nur für ring-Variante) */
  size?: 'sm' | 'md';
}

interface BadgeInfo {
  label: string;
  color: string;
  colorLight: string;
}

function getBadgeInfo(score: number): BadgeInfo {
  if (score >= 85) {
    return {
      label: 'Sehr gut',
      color: '#06d551', // Custom bright green
      colorLight: '#6ee89a', // Lighter version
    };
  } else if (score >= 60) {
    return {
      label: 'Gut',
      color: '#22C55E', // green-500
      colorLight: '#86EFAC', // green-300
    };
  } else if (score >= 40) {
    return {
      label: 'OK',
      color: '#F59E0B', // amber-500
      colorLight: '#FCD34D', // amber-300
    };
  } else {
    return {
      label: 'Schwach',
      color: '#EF4444', // red-500
      colorLight: '#FCA5A5', // red-300
    };
  }
}

export function PropertyScoreBadge({ score, variant = 'overlay', size: sizeProp = 'md' }: PropertyScoreBadgeProps) {
  const { color, colorLight } = getBadgeInfo(score);
  const roundedScore = Math.round(score);

  // Ring Variant - Apple Watch Style
  if (variant === 'ring') {
    // Size configuration
    const isSmall = sizeProp === 'sm';
    const ringSize = isSmall ? 52 : 64;
    const strokeWidth = isSmall ? 7 : 10;
    const radius = (ringSize - strokeWidth * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="relative" style={{ width: ringSize, height: ringSize }}>
        {/* SVG Ring */}
        <svg
          width={ringSize}
          height={ringSize}
          className="transform -rotate-90"
        >
          {/* Background Ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress Ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {/* Center Content - smaller than ring */}
        <div
          className="absolute flex items-center justify-center rounded-full"
          style={{
            top: strokeWidth + 2,
            left: strokeWidth + 2,
            right: strokeWidth + 2,
            bottom: strokeWidth + 2,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <span
            className={`font-bold text-white tabular-nums ${isSmall ? 'text-sm' : 'text-base'}`}
            style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.5)' }}
          >
            {(score / 10).toFixed(1)}
          </span>
        </div>
      </div>
    );
  }

  // Default Overlay Variant
  return (
    <div
      className="rounded-lg flex items-center gap-2 px-3 py-2"
      style={{
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Brain Icon with gradient background - glow effect */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${colorLight} 100%)`,
        }}
      >
        <Brain
          size={22}
          color="black"
          strokeWidth={2}
        />
      </div>
      {/* Label and Score */}
      <div className="flex flex-col">
        <span
          className="text-[11.5px] font-semibold text-white/80 leading-none uppercase"
          style={{ letterSpacing: '0.05em' }}
        >
          AI-Score
        </span>
        <span
          className="text-sm font-bold text-white leading-none mt-0.5"
          style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
        >
          {(score / 10).toFixed(1)} / 10
        </span>
      </div>
    </div>
  );
}
