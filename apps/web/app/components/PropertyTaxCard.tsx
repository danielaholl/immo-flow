'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronUp, PiggyBank, TrendingDown, Info, User } from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export type AfaStrategy = 'bestand' | 'neubau' | 'denkmal';

const AFA_STRATEGIES: Record<AfaStrategy, { rate: number; buildingRatio: number; label: string }> = {
  bestand: { rate: 0.02, buildingRatio: 0.80, label: 'Bestand (2%)' },
  neubau: { rate: 0.05, buildingRatio: 0.85, label: 'Neubau (5%)' },
  denkmal: { rate: 0.09, buildingRatio: 0.90, label: 'Denkmal (9%)' },
};

interface PropertyTaxCardProps {
  purchasePrice: number;
  yearBuilt?: number;
  onStrategyChange?: (strategy: AfaStrategy) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropertyTaxCard({
  purchasePrice,
  yearBuilt,
  onStrategyChange,
}: PropertyTaxCardProps) {
  // Load user's tax profile
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Auto-detect strategy based on year built
  const getInitialStrategy = (): AfaStrategy => {
    if (!yearBuilt) return 'bestand';
    const currentYear = new Date().getFullYear();
    // Neubau: built after 2023 (for degressive AfA)
    if (yearBuilt >= 2024) return 'neubau';
    return 'bestand';
  };

  const [strategy, setStrategy] = useState<AfaStrategy>(getInitialStrategy());
  const [isExpanded, setIsExpanded] = useState(false);
  const [marginalTaxRate, setMarginalTaxRate] = useState(42); // Default 42%
  const [isUsingProfileRate, setIsUsingProfileRate] = useState(false);

  // Update tax rate from user profile when loaded
  useEffect(() => {
    if (taxProfile?.marginal_tax_rate) {
      const profileRate = Math.round(Number(taxProfile.marginal_tax_rate) * 100);
      setMarginalTaxRate(profileRate);
      setIsUsingProfileRate(true);
    }
  }, [taxProfile]);

  // Calculate tax savings for this property
  const taxEffect = useMemo(() => {
    const strategyDetails = AFA_STRATEGIES[strategy];

    // Default financing assumptions
    const ltvRatio = 1.0; // 100% financing
    const interestRate = 0.04; // 4%
    const rentalYield = 0.03; // 3%
    const maintenanceRate = 0.005; // 0.5%

    // Calculate deductions
    const interestDeduction = purchasePrice * ltvRatio * interestRate;
    const depreciationDeduction = purchasePrice * strategyDetails.buildingRatio * strategyDetails.rate;
    const maintenanceDeduction = purchasePrice * maintenanceRate;
    const rentalIncome = purchasePrice * rentalYield;

    // Net tax loss
    const netTaxLoss = interestDeduction + depreciationDeduction + maintenanceDeduction - rentalIncome;

    // Tax savings
    const annualTaxSavings = netTaxLoss * (marginalTaxRate / 100);
    const monthlyTaxSavings = annualTaxSavings / 12;

    return {
      annualTaxSavings: Math.round(annualTaxSavings),
      monthlyTaxSavings: Math.round(monthlyTaxSavings),
      breakdown: {
        interestDeduction: Math.round(interestDeduction),
        depreciationDeduction: Math.round(depreciationDeduction),
        maintenanceDeduction: Math.round(maintenanceDeduction),
        rentalIncome: Math.round(rentalIncome),
        netTaxLoss: Math.round(netTaxLoss),
      },
    };
  }, [purchasePrice, strategy, marginalTaxRate]);

  const handleStrategyChange = (newStrategy: AfaStrategy) => {
    setStrategy(newStrategy);
    onStrategyChange?.(newStrategy);
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <PiggyBank className="text-primary" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Steuer-Ersparnis</h3>
            <p className="text-xs text-gray-500">mit diesem Objekt</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xl font-bold text-primary">
              {formatCurrency(taxEffect.annualTaxSavings)}
            </p>
            <p className="text-xs text-gray-500">pro Jahr</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="text-gray-400" size={20} />
          ) : (
            <ChevronDown className="text-gray-400" size={20} />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Monthly Savings */}
          <div className="bg-white rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-primary" size={16} />
              <span className="text-sm text-gray-600">Monatlich mehr netto:</span>
            </div>
            <span className="font-bold text-primary">
              +{formatCurrency(taxEffect.monthlyTaxSavings)}
            </span>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              AfA-Strategie
            </label>
            <div className="flex gap-2">
              {(Object.keys(AFA_STRATEGIES) as AfaStrategy[]).map((key) => {
                const isSelected = strategy === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleStrategyChange(key)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    {AFA_STRATEGIES[key].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tax Rate Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">
                Dein Grenzsteuersatz
              </label>
              {isUsingProfileRate && (
                <span className="flex items-center gap-1 text-xs text-primary">
                  <User size={10} />
                  aus Profil
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={14}
                max={45}
                value={marginalTaxRate}
                onChange={(e) => {
                  setMarginalTaxRate(Number(e.target.value));
                  setIsUsingProfileRate(false);
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="w-12 text-sm font-medium text-gray-900 text-right">
                {marginalTaxRate}%
              </span>
            </div>
            {!isUsingProfileRate && !taxProfile && (
              <Link
                href="/profile"
                className="block text-xs text-primary hover:underline mt-1"
              >
                Im Profil speichern →
              </Link>
            )}
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1 text-xs font-medium text-gray-600 mb-2">
              <Info size={12} />
              Aufschlüsselung
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">AfA-Abschreibung:</span>
                <span className="text-green-600 font-medium">
                  +{formatCurrency(taxEffect.breakdown.depreciationDeduction)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Zinsabzug:</span>
                <span className="text-green-600 font-medium">
                  +{formatCurrency(taxEffect.breakdown.interestDeduction)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Instandhaltung:</span>
                <span className="text-green-600 font-medium">
                  +{formatCurrency(taxEffect.breakdown.maintenanceDeduction)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Mieteinnahmen:</span>
                <span className="text-red-600 font-medium">
                  -{formatCurrency(taxEffect.breakdown.rentalIncome)}
                </span>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
              <span className="text-gray-700 font-medium">Steuerlicher Verlust:</span>
              <span className="text-green-600 font-bold">
                {formatCurrency(taxEffect.breakdown.netTaxLoss)}
              </span>
            </div>
          </div>

          {/* CTA Link */}
          <Link
            href="/steuer-optimierer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary hover:opacity-90 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Calculator size={16} />
            Zum Steuer-Optimierer
          </Link>

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 text-center">
            Indikation basierend auf Standard-Annahmen. Keine Steuerberatung.
          </p>
        </div>
      )}
    </div>
  );
}

export default PropertyTaxCard;
