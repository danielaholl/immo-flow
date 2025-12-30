'use client';

import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';

interface TaxSavingsDisplayProps {
  targetPortfolioValue: number;
  currentTax: number;
  optimizedTax?: number;
  isLoading?: boolean;
  marginalTaxRate?: number;
  strategy?: 'bestand' | 'altbau' | 'neubau' | 'denkmal';
  breakdown?: {
    depreciationDeduction: number;
    interestDeduction: number;
    maintenanceDeduction: number;
    rentalIncome: number;
    netTaxLoss: number;
  };
  taxTarget?: 'optimal' | 'zero' | 'custom';
  interestRate?: number;
  rentalYield?: number;
  maintenanceRate?: number;
  equityRate?: number;
  tilgungRate?: number;
  isOptimal?: boolean;
  isCashflowNeutral?: boolean;
  monthlyCashflow?: number;
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

export function TaxSavingsDisplay({
  targetPortfolioValue,
  currentTax,
  optimizedTax = 0,
  isLoading = false,
  marginalTaxRate = 0.42,
  strategy = 'neubau',
  breakdown,
  taxTarget = 'optimal',
  interestRate = 0.04,
  rentalYield = 0.03,
  maintenanceRate = 0.005,
  equityRate = 0.2,
  tilgungRate = 0.02,
  isOptimal = false,
  isCashflowNeutral = false,
  monthlyCashflow = 0,
}: TaxSavingsDisplayProps) {
  // Calculate breakdown values
  const strategyDetails = AFA_STRATEGIES[strategy];
  const buildingValue = Math.round(targetPortfolioValue * strategyDetails.buildingRatio);
  const landValue = Math.round(targetPortfolioValue * (1 - strategyDetails.buildingRatio));
  const afaPerYear = breakdown?.depreciationDeduction ?? Math.round(targetPortfolioValue * strategyDetails.buildingRatio * strategyDetails.rate);

  // Calculate detailed breakdown first (needed for custom mode)
  const ltvRatio = 1 - equityRate;
  const detailedBreakdown = useMemo(() => {
    const depreciationDeduction = targetPortfolioValue * strategyDetails.buildingRatio * strategyDetails.rate;
    const interestDeduction = targetPortfolioValue * ltvRatio * interestRate;
    const maintenanceDeduction = targetPortfolioValue * maintenanceRate;
    const tilgungDeduction = targetPortfolioValue * ltvRatio * tilgungRate;
    const rentalIncomeValue = targetPortfolioValue * rentalYield;
    const netTaxLoss = depreciationDeduction + interestDeduction + maintenanceDeduction - rentalIncomeValue;

    return {
      depreciationDeduction: Math.round(depreciationDeduction),
      interestDeduction: Math.round(interestDeduction),
      maintenanceDeduction: Math.round(maintenanceDeduction),
      tilgungDeduction: Math.round(tilgungDeduction),
      rentalIncome: Math.round(rentalIncomeValue),
      netTaxLoss: Math.round(netTaxLoss),
      taxSavings: Math.round(netTaxLoss * marginalTaxRate),
    };
  }, [targetPortfolioValue, strategyDetails, interestRate, maintenanceRate, tilgungRate, rentalYield, marginalTaxRate, ltvRatio]);

  // Bei 'custom' wird die tatsächliche Ersparnis aus den Einstellungen berechnet
  const savings = taxTarget === 'custom' ? detailedBreakdown.taxSavings : currentTax - optimizedTax;
  const savingsPercent = currentTax > 0 ? Math.round((savings / currentTax) * 100) : 0;

  // 10 year savings
  const tenYearSavings = savings * 10;

  return (
    <div className="flex flex-col">
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
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {isOptimal ? 'Optimale Steuerersparnis' : taxTarget === 'custom' ? `${savingsPercent}% Steuerersparnis` : 'Steuerlast = €0'}
              </p>
              {/* Optimal Badges */}
              {isOptimal && (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full">
                    <span className="text-emerald-500">✓</span> Steuer €0
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full">
                    <span className="text-emerald-500">✓</span> CF+
                  </span>
                </>
              )}
            </div>
          </div>
          <button className="ml-auto px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-lg flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">
            <Share2 size={12} />
            Teilen
          </button>
        </div>

        {/* Big Portfolio Value */}
        <div className="mt-12 mb-12">
          <p className={`text-5xl md:text-6xl font-bold text-emerald-600 dark:text-emerald-400 transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {formatCompact(targetPortfolioValue)}
          </p>
          {targetPortfolioValue >= 100000 && (
            <p className="text-sm text-gray-500 mt-2">
              bei {Math.round(equityRate * 100)}% Eigenkapital = €{formatNumber(Math.round(targetPortfolioValue * equityRate))} EK
            </p>
          )}
        </div>

        {/* Portfolio Breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Benötigtes AfA/Jahr</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(afaPerYear)}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Gebäudewert (80%)</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(Math.round(targetPortfolioValue * 0.8))}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Grundstückswert (20%)</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">€{formatNumber(Math.round(targetPortfolioValue * 0.2))}</p>
          </div>
        </div>
      </div>

      {/* Savings Card - Red/Orange Gradient */}
      <div className="bg-gradient-to-r from-rose-500 to-orange-400 rounded-2xl p-5 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-white/80 mb-1">Deine jährliche Steuerersparnis</p>
            <div className="flex items-baseline gap-3 mb-2">
              <p className="text-4xl font-bold text-white">
                {formatCurrency(savings)}
              </p>
              <span className="text-2xl font-bold text-white/90">
                ({savingsPercent}%)
              </span>
            </div>
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

      {/* Breakdown Section */}
      <div>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Steuerliche Aufschlüsselung Card */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Steuerliche Aufschlüsselung</h4>

              {(() => {
                const currentTaxableIncome = Math.round(currentTax / marginalTaxRate);
                const newTaxableIncome = currentTaxableIncome + detailedBreakdown.rentalIncome - detailedBreakdown.depreciationDeduction - detailedBreakdown.interestDeduction - detailedBreakdown.maintenanceDeduction;
                const newTax = Math.round(newTaxableIncome * marginalTaxRate);
                const taxSavingsCalc = currentTax - newTax;

                return (
                  <div className="space-y-2">
                    {/* Current taxable income */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Zu versteuerndes Einkommen</span>
                      <span className="text-gray-900 dark:text-white font-medium">€{formatNumber(currentTaxableIncome)}</span>
                    </div>

                    {/* Rental income */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">+ Mieteinnahmen ({(rentalYield * 100).toFixed(1)}%)</span>
                      <span className="text-red-500 font-medium">+€{formatNumber(detailedBreakdown.rentalIncome)}</span>
                    </div>

                    {/* Deductions */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">- AfA-Abschreibung ({(strategyDetails.rate * 100).toFixed(0)}%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-€{formatNumber(detailedBreakdown.depreciationDeduction)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">- Zinsabzug ({(interestRate * 100).toFixed(1)}%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-€{formatNumber(detailedBreakdown.interestDeduction)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">- Instandhaltung ({(maintenanceRate * 100).toFixed(1)}%)</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">-€{formatNumber(detailedBreakdown.maintenanceDeduction)}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-300 dark:border-gray-600 my-3" />

                    {/* New taxable income */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white font-semibold">= Neues zu verst. Einkommen</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">€{formatNumber(newTaxableIncome)}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">× Grenzsteuersatz {(marginalTaxRate * 100).toFixed(0)}%</span>
                      <span className="text-gray-500 dark:text-gray-400"></span>
                    </div>

                    {/* New tax */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">= Neue Steuerlast</span>
                      <span className="text-gray-900 dark:text-white font-medium">€{formatNumber(newTax)}</span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-300 dark:border-gray-600 my-3" />

                    {/* Tax savings */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white font-semibold">= Steuerersparnis</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">€{formatNumber(taxSavingsCalc)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Cashflow-Berechnung Card */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cashflow-Berechnung</h4>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Mieteinnahmen</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">+€{formatNumber(detailedBreakdown.rentalIncome)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Zinsen ({Math.round((1 - equityRate) * 100)}%-{(interestRate * 100).toFixed(1)}%)</span>
                  <span className="text-red-500 font-medium">-€{formatNumber(detailedBreakdown.interestDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Tilgung ({Math.round((1 - equityRate) * 100)}%-{(tilgungRate * 100).toFixed(1)}%)</span>
                  <span className="text-red-500 font-medium">-€{formatNumber(detailedBreakdown.tilgungDeduction)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Instandhaltung</span>
                  <span className="text-red-500 font-medium">-€{formatNumber(detailedBreakdown.maintenanceDeduction)}</span>
                </div>

                <div className="border-t border-gray-300 dark:border-gray-600 my-3" />

                {(() => {
                  const cashflow = detailedBreakdown.rentalIncome - detailedBreakdown.interestDeduction - detailedBreakdown.tilgungDeduction - detailedBreakdown.maintenanceDeduction;
                  const isPositive = cashflow >= 0;
                  return (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-900 dark:text-white font-semibold">= Cashflow/Jahr</span>
                      <span className={`text-lg font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}€{formatNumber(cashflow)}
                      </span>
                    </div>
                  );
                })()}

                {(() => {
                  const cashflow = detailedBreakdown.rentalIncome - detailedBreakdown.interestDeduction - detailedBreakdown.tilgungDeduction - detailedBreakdown.maintenanceDeduction;
                  const monthlyCashflow = Math.round(cashflow / 12);
                  const isPositive = monthlyCashflow >= 0;
                  return (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">= Cashflow/Monat</span>
                      <span className={`font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}€{formatNumber(monthlyCashflow)}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
      </div>

    </div>
  );
}

export default TaxSavingsDisplay;
