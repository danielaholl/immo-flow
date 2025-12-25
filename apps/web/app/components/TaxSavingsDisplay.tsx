'use client';

import React from 'react';

interface TaxSavingsDisplayProps {
  targetPortfolioValue: number;
  currentTax: number;
  optimizedTax?: number; // Usually 0
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.', ',')} Mio. €`;
  }
  if (value >= 1000) {
    // Format as "985.000 €"
    return new Intl.NumberFormat('de-DE').format(value) + ' €';
  }
  return formatCurrency(value);
}

export function TaxSavingsDisplay({
  targetPortfolioValue,
  currentTax,
  optimizedTax = 0,
  isLoading = false,
}: TaxSavingsDisplayProps) {
  // Calculate bar heights (current tax is 100%, optimized is relative)
  const maxBarHeight = 180; // pixels
  const currentBarHeight = maxBarHeight;
  const optimizedBarHeight =
    currentTax > 0 ? Math.max((optimizedTax / currentTax) * maxBarHeight, 8) : 8;

  const savings = currentTax - optimizedTax;

  return (
    <div className="flex flex-col items-center justify-center py-6 px-4">
      {/* Big Number Section */}
      <div className="text-center mb-8">
        <h2 className="text-gray-800 text-xl md:text-2xl font-bold mb-3">Nötiges Immobilien-Portfolio:</h2>
        {isLoading ? (
          <div className="h-16 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="text-4xl md:text-5xl font-bold text-green-600">
            {formatCompact(targetPortfolioValue)}
          </div>
        )}
      </div>

      {/* Vertical Bar Chart */}
      <div className="flex flex-col items-center mb-6 w-full">
        {/* Bars container */}
        <div className="flex items-end justify-between w-[80%] px-4">
          {/* Current Tax Bar (Red) */}
          <div className="flex flex-col items-center flex-1 max-w-[45%]">
            <div
              className="w-full max-w-32 bg-gradient-to-t from-red-500 to-red-400 rounded-lg transition-all duration-500 relative shadow-lg"
              style={{ height: `${currentBarHeight}px` }}
            >
              {/* Value inside bar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm md:text-base">
                  {formatCurrency(currentTax)}
                </span>
              </div>
            </div>
          </div>

          {/* Optimized Tax Bar (Green) - same height, light green with dark green bottom 1/3 */}
          <div className="flex flex-col items-center flex-1 max-w-[45%]">
            <div
              className="w-full max-w-32 relative rounded-lg overflow-hidden shadow-lg"
              style={{ height: `${currentBarHeight}px` }}
            >
              {/* Light green background (full height) */}
              <div className="absolute inset-0 bg-green-200" />

              {/* Dark green bottom 1/3 */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-600 to-green-500 flex items-center justify-center"
                style={{ height: '33.33%' }}
              >
                <span className="text-white font-bold text-sm md:text-base">0 €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Continuous gray separator line under both bars */}
        <div className="w-[80%] h-px bg-gray-300 mt-2" />

        {/* Labels */}
        <div className="flex justify-between w-[80%] mt-2 gap-2">
          <p className="text-xs sm:text-sm text-gray-600 text-center font-medium flex-1 whitespace-nowrap">
            Deine Steuer Heute
          </p>
          <p className="text-xs sm:text-sm text-gray-600 text-center font-medium flex-1 whitespace-nowrap">
            Mit Immobilien
          </p>
        </div>
      </div>

      {/* Savings Summary */}
      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl text-center w-full max-w-sm">
        <p className="text-sm text-green-700">
          Du sparst{' '}
          <span className="font-bold text-green-800">
            {formatCurrency(savings)}
          </span>{' '}
          pro Jahr
        </p>
        <p className="text-xs text-green-600 mt-1">
          Das sind{' '}
          <span className="font-semibold">
            {formatCurrency(Math.round(savings / 12))}
          </span>{' '}
          mehr netto pro Monat
        </p>
      </div>
    </div>
  );
}

export default TaxSavingsDisplay;
