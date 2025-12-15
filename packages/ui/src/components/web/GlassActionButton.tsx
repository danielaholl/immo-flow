'use client';

import React from 'react';
import { Heart, X } from 'lucide-react';

type ActionType = 'favorite' | 'dismiss';

interface GlassActionButtonProps {
  type: ActionType;
  onClick?: (e: React.MouseEvent) => void;
  isActive?: boolean; // For favorite: filled heart
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: { button: 44, icon: 20 },
  md: { button: 52, icon: 24 },
  lg: { button: 60, icon: 28 },
};

const typeConfig = {
  favorite: {
    color: '#FF385C', // primary coral accent
    tooltip: 'Zu Favoriten hinzufügen',
    tooltipActive: 'Aus Favoriten entfernen',
  },
  dismiss: {
    color: '#FFFFFF', // white
    tooltip: 'Nicht interessiert',
  },
};

export function GlassActionButton({
  type,
  onClick,
  isActive = false,
  size = 'md',
  className = '',
}: GlassActionButtonProps) {
  const { button: buttonSize, icon: iconSize } = sizeConfig[size];
  const config = typeConfig[type];
  const tooltip = type === 'favorite' && isActive
    ? config.tooltipActive
    : config.tooltip;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        className={`rounded-full flex items-center justify-center
                    hover:scale-105 active:scale-95 transition-all ${className}`}
        style={{
          width: buttonSize,
          height: buttonSize,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}
      >
        {type === 'favorite' ? (
          <Heart
            size={iconSize}
            color={config.color}
            fill={isActive ? config.color : 'none'}
            strokeWidth={2}
          />
        ) : (
          <X
            size={iconSize}
            color={config.color}
            strokeWidth={2.5}
          />
        )}
      </button>
      {/* Tooltip */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg
                   text-xs font-medium text-white whitespace-nowrap
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {tooltip}
      </div>
    </div>
  );
}
