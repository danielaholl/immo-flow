'use client';

import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';

interface TaxSavingsDisplayProps {
  targetPortfolioValue: number;
  currentTax: number;
  optimizedTax?: number;
  isLoading?: boolean;
  customPortfolioValue?: number | null;
  onCustomPortfolioChange?: (value: number | null) => void;
  marginalTaxRate?: number;
  strategy?: 'bestand' | 'altbau' | 'neubau' | 'denkmal';
  breakdown?: {
    depreciationDeduction: number;
    interestDeduction: number;
    maintenanceDeduction: number;
    rentalIncome: number;
    netTaxLoss: number;
  };
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
    return `€${(value / 1000000).toFixed(1).replace('.', ',')} Mio.`;
  }
  return `€${new Intl.NumberFormat('de-DE').format(value)}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

// AfA strategy constants
const AFA_STRATEGIES = {
  bestand: { rate: 0.02, buildingRatio: 0.80 },
  altbau: { rate: 0.025, buildingRatio: 0.80 },
  neubau: { rate: 0.04, buildingRatio: 0.85 },
  denkmal: { rate: 0.09, buildingRatio: 0.35 },
} as const;

// Calculate tax savings for a given portfolio value
function calculateTaxSavingsForPortfolio(
  portfolioValue: number,
  marginalTaxRate: number,
  strategy: keyof typeof AFA_STRATEGIES
) {
  const strategyDetails = AFA_STRATEGIES[strategy];
  const ltvRatio = 1.0;
  const interestRate = 0.04;
  const rentalYield = 0.03;
  const maintenanceRate = 0.005;

  const interestDeduction = portfolioValue * ltvRatio * interestRate;
  const depreciationDeduction = portfolioValue * strategyDetails.buildingRatio * strategyDetails.rate;
  const maintenanceDeduction = portfolioValue * maintenanceRate;
  const rentalIncome = portfolioValue * rentalYield;
  const netTaxLoss = interestDeduction + depreciationDeduction + maintenanceDeduction - rentalIncome;
  const annualTaxSavings = netTaxLoss * marginalTaxRate;

  return {
    annualTaxSavings: Math.round(annualTaxSavings),
    monthlyTaxSavings: Math.round(annualTaxSavings / 12),
  };
}

export function TaxSavingsDisplay({
  targetPortfolioValue,
  currentTax,
  optimizedTax = 0,
  isLoading = false,
  customPortfolioValue,
  onCustomPortfolioChange,
  marginalTaxRate = 0.42,
  strategy = 'neubau',
  breakdown,
}: TaxSavingsDisplayProps) {
  const effectivePortfolioValue = customPortfolioValue ?? targetPortfolioValue;
  const isUsingCustomValue = customPortfolioValue !== null && customPortfolioValue !== undefined;

  // Calculate savings
  const customSavings = useMemo(() => {
    if (effectivePortfolioValue <= 0) return null;
    return calculateTaxSavingsForPortfolio(effectivePortfolioValue, marginalTaxRate, strategy);
  }, [effectivePortfolioValue, marginalTaxRate, strategy]);

  const savings = currentTax - optimizedTax;
  const savingsPercent = currentTax > 0 ? Math.round((savings / currentTax) * 100) : 0;

  // Calculate breakdown values
  const strategyDetails = AFA_STRATEGIES[strategy];
  const buildingValue = Math.round(effectivePortfolioValue * strategyDetails.buildingRatio);
  const landValue = Math.round(effectivePortfolioValue * (1 - strategyDetails.buildingRatio));
  const afaPerYear = breakdown?.depreciationDeduction ?? Math.round(effectivePortfolioValue * strategyDetails.buildingRatio * strategyDetails.rate);

  // 10 year savings
  const tenYearSavings = savings * 10;

  return (
    <div className="flex flex-col h-full">
      {/* Portfolio Value Section */}
      <div className="text-center mb-6">
        {/* Circle Icon with Label */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-500 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gray-400 dark:bg-gray-600" />
            </div>
          </div>
          <div className="text-left">
            <p className="text-xs text-gray-500">Benötigtes Portfolio für</p>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Steuerlast = €0</p>
          </div>
          <button className="ml-auto px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">
            <Share2 size={12} />
            Teilen
          </button>
        </div>

        {/* Big Portfolio Value */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Gesamt-Portfoliowert</p>
          {isLoading ? (
            <div className="h-14 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-4xl md:text-5xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCompact(effectivePortfolioValue)}
            </p>
          )}
          {effectivePortfolioValue >= 100000 && (
            <p className="text-xs text-gray-500 mt-1">
              bei 60% Fremdfinanzierung = €{formatNumber(Math.round(effectivePortfolioValue * 0.4))} Eigenkapital
            </p>
          )}
        </div>

        {/* Portfolio Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Benötigtes AfA/Jahr</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(afaPerYear)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Gebäudewert ({Math.round(strategyDetails.buildingRatio * 100)}%)</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(buildingValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Grundstückswert</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(landValue)}</p>
          </div>
        </div>
      </div>

      {/* Savings Card - Red/Orange Gradient */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-400 rounded-2xl p-5 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-white/80 mb-1">Deine jährliche Steuerersparnis</p>
            <p className="text-4xl font-bold text-white mb-2">
              {formatCurrency(savings)}
            </p>
            <p className="text-sm text-white/80">
              +{formatCurrency(Math.round(savings / 12))}/Monat mehr netto in der Tasche
            </p>
          </div>
          <div className="text-right bg-white/10 rounded-xl px-4 py-3">
            <p className="text-xs text-white/70 mb-1">in 10 Jahren</p>
            <p className="text-2xl font-bold text-white">
              €{formatNumber(tenYearSavings)}
            </p>
            <p className="text-xs text-white/70">gespart</p>
          </div>
        </div>
      </div>

      {/* Tax Comparison - Horizontal Bars */}
      <div className="bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-5">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
          Steuerbelastung: Vorher vs. Nachher
        </h4>

        {/* Current Tax Bar (Red) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Ohne Immobilien</span>
            <span className="text-sm font-semibold text-rose-500 dark:text-rose-400">{formatCurrency(currentTax)}</span>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-lg flex items-center justify-end pr-3"
              style={{ width: '100%' }}
            >
              <span className="text-xs text-white font-medium">100% Steuerlast</span>
            </div>
          </div>
        </div>

        {/* Optimized Tax Bar (Green) */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Mit Immobilien</span>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(optimizedTax)}</span>
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
            {/* Progress indicator showing reduction */}
            <div className="absolute inset-0 flex items-center">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center"
                style={{ width: optimizedTax > 0 ? `${(optimizedTax / currentTax) * 100}%` : '10%', minWidth: '80px' }}
              >
                <span className="text-xs text-white font-medium">
                  {optimizedTax === 0 ? '0%' : `${Math.round((optimizedTax / currentTax) * 100)}%`} Steuerlast
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Summary */}
        <div className="flex items-center justify-center pt-2">
          <div className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-medium">
            -{savingsPercent}% Steuerersparnis
          </div>
        </div>
      </div>

      {/* Was-wäre-wenn Slider */}
      {onCustomPortfolioChange && targetPortfolioValue > 0 && (
        <div className="mt-6 bg-gray-100 dark:bg-gray-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Was wäre wenn?</h4>
            {isUsingCustomValue && (
              <button
                onClick={() => onCustomPortfolioChange(null)}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium"
              >
                Zurücksetzen
              </button>
            )}
          </div>

          <input
            type="range"
            min={50000}
            max={Math.max(targetPortfolioValue, 100000)}
            step={10000}
            value={effectivePortfolioValue}
            onChange={(e) => onCustomPortfolioChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 mb-2"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>€50.000</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCompact(effectivePortfolioValue)}</span>
            <span>{formatCompact(Math.max(targetPortfolioValue, 100000))}</span>
          </div>

          {isUsingCustomValue && customSavings && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-transparent">
                <p className="text-xs text-gray-500 mb-1">Jährliche Ersparnis</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(customSavings.annualTaxSavings)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-transparent">
                <p className="text-xs text-gray-500 mb-1">Monatlich mehr netto</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(customSavings.monthlyTaxSavings)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaxSavingsDisplay;
