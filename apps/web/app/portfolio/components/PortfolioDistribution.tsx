'use client';

import React from 'react';
import { trpc } from '../../../lib/trpc';
import { PieChart, Home, Building, Store, Users } from 'lucide-react';

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Property type configuration
const PROPERTY_TYPES: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  apartment: { label: 'Wohnung', color: '#d100ff', icon: Building },
  house: { label: 'Haus', color: '#10B981', icon: Home },
  commercial: { label: 'Gewerbe', color: '#F59E0B', icon: Store },
  multi_family: { label: 'Mehrfamilienhaus', color: '#3B82F6', icon: Users },
  other: { label: 'Sonstige', color: '#6B7280', icon: Building },
};

interface PortfolioDistributionProps {
  className?: string;
}

export function PortfolioDistribution({ className = '' }: PortfolioDistributionProps) {
  const { data: properties, isLoading } = trpc.portfolio.getAll.useQuery();

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate distribution by property type
  const distribution: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;

  if (properties) {
    for (const property of properties) {
      const type = property.property_type || 'other';
      // Use metrics.currentValue first, then current_value, then purchase_price
      const value = Number(property.metrics?.currentValue) ||
                    Number(property.current_value) ||
                    Number(property.purchase_price) || 0;
      totalValue += value;

      if (!distribution[type]) {
        distribution[type] = { count: 0, value: 0 };
      }
      distribution[type].count += 1;
      distribution[type].value += value;
    }
  }

  // Create array with all property types (show all, even with 0)
  const allTypes = ['apartment', 'house', 'multi_family', 'commercial'];
  const distributionArray = allTypes
    .map((type) => {
      const data = distribution[type] || { count: 0, value: 0 };
      return {
        type,
        ...data,
        percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
        config: PROPERTY_TYPES[type],
      };
    })
    .sort((a, b) => b.value - a.value);

  const hasData = distributionArray.length > 0;

  // SVG Pie Chart parameters
  const size = 160;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate stroke dash offset for each segment
  let cumulativeOffset = 0;
  const segments = distributionArray.map((item) => {
    const segmentLength = (item.percentage / 100) * circumference;
    const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += segmentLength;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Portfolio-Verteilung</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {!hasData ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-xl">
            <PieChart className="w-10 h-10 mb-3 opacity-50" />
            <p className="font-medium">Keine Immobilien</p>
            <p className="text-sm">Füge Immobilien hinzu</p>
          </div>
        ) : (
          <div className="flex items-center gap-6">
            {/* Pie Chart - Left */}
            <div className="relative flex-shrink-0">
              <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {segments.map((segment) => (
                  <circle
                    key={segment.type}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={segment.config.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={segment.strokeDasharray}
                    strokeDashoffset={segment.strokeDashoffset}
                    className="transition-all duration-500"
                  />
                ))}
              </svg>
              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {properties?.length || 0}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {properties?.length === 1 ? 'Objekt' : 'Objekte'}
                </span>
              </div>
            </div>

            {/* Legend - Right */}
            <div className="flex-1 space-y-1">
              {segments.map((segment) => {
                const Icon = segment.config.icon;
                return (
                  <div
                    key={segment.type}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: segment.config.color }}
                      />
                      <Icon size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {segment.config.label}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({segment.count})
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[60px] text-right">
                        {formatCurrency(segment.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
