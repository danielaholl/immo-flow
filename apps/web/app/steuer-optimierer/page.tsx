'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Building2, Check, ChevronDown, ImageOff } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';
import { TaxSavingsDisplay } from '../components/TaxSavingsDisplay';
import { Header } from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';

type AfaStrategy = 'bestand' | 'altbau' | 'neubau' | 'denkmal';
type TaxTarget = 'optimal' | 'zero' | 'custom';

// Standard-Parameter für €0 und 50% Modus
const DEFAULT_PARAMS = {
  interestRate: 4,        // 4% Zins
  tilgungRate: 2,         // 2% Tilgung
  rentalYield: 3.5,       // 3.5% Mietrendite
  maintenanceRate: 0.3,   // 0.3% Instandhaltung
  equityRate: 20,         // 20% EK
};

// Optimale Parameter für Optimal-Modus (Cashflow = 0)
const OPTIMAL_PARAMS = {
  strategy: 'neubau' as AfaStrategy,
  interestRate: 4,        // 4% Zins
  tilgungRate: 1,         // 1% Tilgung (minimal)
  maintenanceRate: 0.1,   // 0.1% Instandhaltung (Neubau)
  equityRate: 5,          // 5% EK (maximal)
  // Mietrendite wird berechnet: LTV * (Zins + Tilgung) + Instand
  // 0.95 * (4% + 1%) + 0.1% = 4.85%
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

function formatCompact(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1).replace('.', ',')} Mio.`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return formatNumber(value);
}

// Property Card for matching properties - Theme-aware
interface PropertyMatchCardProps {
  property: {
    id: string;
    title: string;
    price: number;
    location: string;
    sqm: number;
    rooms: number;
    images: string[];
    ai_investment_score?: number;
  };
  taxSavings: number;
}

function PropertyMatchCard({ property, taxSavings }: PropertyMatchCardProps) {
  const imageUrl = property.images?.[0];
  const hasImage = Boolean(imageUrl && imageUrl.trim().length > 0);
  const [imageError, setImageError] = useState(false);

  const showPlaceholder = !hasImage || imageError;

  return (
    <Link
      href={`/property/${property.id}`}
      className="block bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="relative h-28">
        {!showPlaceholder ? (
          <Image
            src={imageUrl!}
            alt={property.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 300px"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <ImageOff size={24} className="text-gray-400 dark:text-gray-500" />
          </div>
        )}
        {/* Badge */}
        <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 z-20">
          <Check size={10} />
          Geprüft
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
          {property.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{property.location}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(property.price)}
          </span>
          <span className="text-xs text-gray-500">
            {property.sqm} m² · {property.rooms} Zi.
          </span>
        </div>
        {taxSavings > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Spart dir {formatCurrency(taxSavings)}/Jahr
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function SteuerOptimiererPage() {
  // Form state
  const [annualTaxPaid, setAnnualTaxPaid] = useState<number>(42000);
  const [marginalTaxRate, setMarginalTaxRate] = useState<number>(42);
  const [strategy, setStrategy] = useState<AfaStrategy>('neubau');
  const [taxTarget, setTaxTarget] = useState<TaxTarget>('optimal');

  // Annahmen State - Default: Standard-Werte
  const [interestRate, setInterestRate] = useState<number>(DEFAULT_PARAMS.interestRate);
  const [tilgungRate, setTilgungRate] = useState<number>(DEFAULT_PARAMS.tilgungRate);
  const [rentalYield, setRentalYield] = useState<number>(DEFAULT_PARAMS.rentalYield);
  const [maintenanceRate, setMaintenanceRate] = useState<number>(DEFAULT_PARAMS.maintenanceRate);
  const [equityRate, setEquityRate] = useState<number>(DEFAULT_PARAMS.equityRate);


  // Load user's tax profile
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Update values from user profile when loaded
  useEffect(() => {
    if (taxProfile) {
      if (taxProfile.annual_tax_paid) {
        setAnnualTaxPaid(Number(taxProfile.annual_tax_paid));
      }
      if (taxProfile.marginal_tax_rate) {
        setMarginalTaxRate(Math.round(Number(taxProfile.marginal_tax_rate) * 100));
      }
      if (taxProfile.preferred_strategy) {
        setStrategy(taxProfile.preferred_strategy as AfaStrategy);
      }
    }
  }, [taxProfile]);

  // Track changes to inputs
  const handleInputChange = useCallback(() => {
    // Can be used for future input tracking
  }, []);


  // Get the default AfA rate for the current strategy
  const defaultAfaRate = useMemo(() => {
    const rates: Record<AfaStrategy, number> = { bestand: 2, altbau: 2.5, neubau: 4, denkmal: 9 };
    return rates[strategy];
  }, [strategy]);

  // Handle strategy change
  const handleStrategyChange = useCallback((newStrategy: AfaStrategy) => {
    setStrategy(newStrategy);
  }, []);

  // Handle "Optimal" click - set parameters and calculate required rental yield for Cashflow = 0
  const handleOptimalClick = useCallback(() => {
    setTaxTarget('optimal');
    setStrategy(OPTIMAL_PARAMS.strategy);
    setInterestRate(OPTIMAL_PARAMS.interestRate);
    setTilgungRate(OPTIMAL_PARAMS.tilgungRate);
    setMaintenanceRate(OPTIMAL_PARAMS.maintenanceRate);
    setEquityRate(OPTIMAL_PARAMS.equityRate);

    // Berechne nötige Mietrendite für Cashflow = 0
    // Formel: Mietrendite = LTV * (Zins + Tilgung) + Instandhaltung
    const ltv = (100 - OPTIMAL_PARAMS.equityRate) / 100; // 0.95 bei 5% EK
    const requiredYield = ltv * (OPTIMAL_PARAMS.interestRate + OPTIMAL_PARAMS.tilgungRate) + OPTIMAL_PARAMS.maintenanceRate;
    setRentalYield(Math.round(requiredYield * 10) / 10); // Auf 0.1% runden
  }, []);

  // Handle "€0" click - set default parameters
  const handleZeroClick = useCallback(() => {
    setTaxTarget('zero');
    setInterestRate(DEFAULT_PARAMS.interestRate);
    setTilgungRate(DEFAULT_PARAMS.tilgungRate);
    setRentalYield(DEFAULT_PARAMS.rentalYield);
    setMaintenanceRate(DEFAULT_PARAMS.maintenanceRate);
    setEquityRate(DEFAULT_PARAMS.equityRate);
  }, []);

  // Handle "Individuell" click - user can adjust parameters themselves
  const handleCustomClick = useCallback(() => {
    setTaxTarget('custom');
    setInterestRate(DEFAULT_PARAMS.interestRate);
    setTilgungRate(DEFAULT_PARAMS.tilgungRate);
    setRentalYield(DEFAULT_PARAMS.rentalYield);
    setMaintenanceRate(DEFAULT_PARAMS.maintenanceRate);
    setEquityRate(DEFAULT_PARAMS.equityRate);
    setShowAssumptions(true); // Annahmen automatisch öffnen
  }, []);

  // Calculate the target portfolio value (for €0 and 50% modes)
  const calculationResult = trpc.taxOptimizer.calculate.useQuery(
    {
      annualTaxPaid,
      marginalTaxRate: marginalTaxRate / 100,
      strategy,
      ltvRatio: (100 - equityRate) / 100,
      interestRate: interestRate / 100,
      rentalYield: rentalYield / 100,
      maintenanceRate: maintenanceRate / 100,
    },
    {
      enabled: annualTaxPaid > 0 && marginalTaxRate > 0 && taxTarget !== 'optimal',
    }
  );

  // Calculate optimal portfolio (cashflow-neutral)
  // Pass user's equityRate as ltvRatio override so slider changes affect the result
  const optimalResult = trpc.taxOptimizer.calculateOptimal.useQuery(
    {
      annualTaxPaid,
      marginalTaxRate: marginalTaxRate / 100,
      strategy,
      interestRate: interestRate / 100,
      tilgungRate: tilgungRate / 100,
      rentalYield: rentalYield / 100,
      maintenanceRate: maintenanceRate / 100,
      ltvRatio: (100 - equityRate) / 100, // Pass user's EK as LTV override
    },
    {
      enabled: annualTaxPaid > 0 && marginalTaxRate > 0 && taxTarget === 'optimal',
    }
  );

  // Target portfolio value from calculation (for 0€ tax)
  const fullTargetPortfolioValue = calculationResult.data?.targetPortfolioValue ?? 0;
  const optimalPortfolioValue = optimalResult.data?.targetPortfolioValue ?? 0;

  // Effective equity rate is now always the slider value
  const effectiveEquityRate = equityRate;

  // Adjust portfolio value based on tax target
  const targetPortfolioValue = useMemo(() => {
    if (taxTarget === 'optimal') {
      return optimalPortfolioValue;
    }
    // Bei 'zero' und 'custom' wird das volle Portfolio verwendet
    return fullTargetPortfolioValue;
  }, [taxTarget, optimalPortfolioValue, fullTargetPortfolioValue]);

  // Check if calculation is loading
  const isCalculating = taxTarget === 'optimal' ? optimalResult.isLoading : calculationResult.isLoading;

  // Get all properties (independent of portfolio value)
  const allProperties = trpc.taxOptimizer.getAllPropertiesForTaxOptimizer.useQuery(
    { limit: 6 }
  );

  // Helper function to get AfA details - prefers persisted values, falls back to calculation
  const getAfaDetails = (
    afaRate: number | null,
    buildingRatio: number | null,
    yearBuilt: number | null,
    afaType: string | null
  ) => {
    // Use persisted values if available
    if (afaRate !== null && buildingRatio !== null) {
      return { rate: Number(afaRate), buildingRatio: Number(buildingRatio) };
    }

    // Fallback: Calculate from afa_type if explicitly set
    if (afaType === 'denkmal') return { rate: 0.09, buildingRatio: 0.35 };
    if (afaType === 'neubau') return { rate: 0.05, buildingRatio: 0.85 };
    if (afaType === 'altbau') return { rate: 0.025, buildingRatio: 0.80 };
    if (afaType === 'bestand') return { rate: 0.02, buildingRatio: 0.80 };

    // Fallback: Calculate from year_built
    if (!yearBuilt) return { rate: 0.02, buildingRatio: 0.80 };
    if (yearBuilt < 1925) return { rate: 0.025, buildingRatio: 0.80 };
    if (yearBuilt >= 2024) return { rate: 0.05, buildingRatio: 0.85 };
    return { rate: 0.02, buildingRatio: 0.80 };
  };

  // Calculate tax savings for each property, filter by max savings, and sort (highest first)
  const propertiesWithSavings = useMemo(() => {
    if (!allProperties.data) return [];

    const ltvRatio = (100 - equityRate) / 100; // Fremdfinanzierung = 100% - Eigenkapital

    return allProperties.data
      .map((property: { id: string; price: number; title: string; location: string; sqm: number; rooms: number; images: string[]; ai_investment_score?: number; year_built?: number | null; afa_type?: string | null; afa_rate?: number | null; building_ratio?: number | null }) => {
        // Get AfA details - prefer persisted values, fallback to calculation
        const afaDetails = getAfaDetails(
          property.afa_rate ?? null,
          property.building_ratio ?? null,
          property.year_built ?? null,
          property.afa_type ?? null
        );

        const interestDeduction = property.price * ltvRatio * (interestRate / 100);
        const depreciationDeduction = property.price * afaDetails.buildingRatio * afaDetails.rate;
        const maintenanceDeduction = property.price * (maintenanceRate / 100);
        const rentalIncomeValue = property.price * (rentalYield / 100);
        const netTaxLoss = interestDeduction + depreciationDeduction + maintenanceDeduction - rentalIncomeValue;
        const taxSavings = Math.round(netTaxLoss * (marginalTaxRate / 100));

        return {
          ...property,
          taxSavings,
          afaRate: afaDetails.rate,
        };
      })
      .filter((property) => property.taxSavings <= annualTaxPaid) // Only show properties where savings <= paid taxes
      .sort((a, b) => b.taxSavings - a.taxSavings); // Sort by savings descending
  }, [allProperties.data, marginalTaxRate, annualTaxPaid, interestRate, rentalYield, maintenanceRate, equityRate]);

  const handleTaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setAnnualTaxPaid(value === '' ? 0 : Number(value));
  }, []);

  // Show/Hide Annahmen
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <div className="bg-slate-50 dark:bg-[#030712] min-h-screen">
      <Header />
      <div className="lg:h-[calc(100vh-80px)] lg:flex lg:flex-col lg:overflow-hidden">
        {/* Hero Section */}
        <div className="text-center py-4 flex-shrink-0 px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            Steuer-Optimierer
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Berechne dein optimales Immobilienportfolio zur Steuerreduktion
          </p>
        </div>

        {/* Main Content Grid */}
        <main className="flex-1 px-4 pb-4 min-h-0">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 max-w-[1600px] mx-auto">

            {/* Left Column - Inputs */}
            <div className="lg:col-span-3 h-full flex flex-col gap-4 overflow-y-auto pr-1">
              {/* Deine Steuersituation Card */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">
                  Deine Steuersituation
                </h3>

                {/* Annual Tax Input with Slider */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Jährlich bezahlte Einkommensteuer
                  </label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-lg">€</span>
                    <input
                      type="text"
                      value={formatNumber(annualTaxPaid)}
                      onChange={(e) => {
                        handleTaxChange(e);
                        handleInputChange();
                      }}
                      className="w-full pl-10 pr-14 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg font-medium focus:ring-2 focus:ring-pink-500 focus:border-orange-400 outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">/Jahr</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    = ca. {formatCompact(annualTaxPaid / (marginalTaxRate / 100))} € zu versteuerndes Einkommen
                  </p>
                </div>

                {/* Tax Rate Display with Slider */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Dein Grenzsteuersatz
                  </label>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">{marginalTaxRate}</span>
                    <span className="text-xl bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">%</span>
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={45}
                    step={1}
                    value={marginalTaxRate}
                    onChange={(e) => {
                      setMarginalTaxRate(Number(e.target.value));
                      handleInputChange();
                    }}
                    className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-pink-500 [&::-webkit-slider-thumb]:to-orange-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-pink-500 [&::-moz-range-thumb]:to-orange-400 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>14%</span>
                    <span>45%</span>
                  </div>
                </div>

                {/* Ziel Steuerlast Buttons */}
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Ziel Steuerlast
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={handleOptimalClick}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'optimal'
                          ? 'bg-gradient-to-br from-green-500 to-teal-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Optimal
                    </button>
                    <button
                      onClick={handleZeroClick}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'zero'
                          ? 'bg-gradient-to-br from-green-500 to-teal-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      €0
                    </button>
                    <button
                      onClick={handleCustomClick}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'custom'
                          ? 'bg-gradient-to-br from-green-500 to-teal-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Individuell
                    </button>
                  </div>
                </div>
              </div>

              {/* Annahmen Card */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <button
                  onClick={() => setShowAssumptions(!showAssumptions)}
                  className="w-full flex items-center justify-between text-gray-900 dark:text-white"
                >
                  <span className="font-semibold">Annahmen</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-1">
                    Anpassen
                    <ChevronDown size={16} className={`transition-transform ${showAssumptions ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {showAssumptions ? (
                  <div className="mt-4 space-y-4">
                    {/* Optimal Badge */}
                    {taxTarget === 'optimal' && (
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">Empfohlen für positiven Cashflow</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Diese Werte ermöglichen Steuer = €0 mit positivem Cashflow
                        </p>
                      </div>
                    )}

                    {/* Strategy Selection */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-2">AfA-Strategie</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['bestand', 'altbau', 'neubau', 'denkmal'] as AfaStrategy[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStrategyChange(s)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              strategy === s
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/50'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            {s === 'bestand' && 'Bestand 2%'}
                            {s === 'altbau' && 'Altbau 2,5%'}
                            {s === 'neubau' && 'Neubau 5%'}
                            {s === 'denkmal' && 'Denkmal 9%'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Eigenkapital Slider - Nach AfA-Strategie */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Eigenkapital</span>
                        <span className="text-gray-900 dark:text-white font-medium">{equityRate}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={equityRate}
                        onChange={(e) => setEquityRate(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>

                    {/* Zinssatz und Tilgung Slider - nebeneinander */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Zinssatz Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Zinssatz</span>
                          <span className="text-gray-900 dark:text-white font-medium">{interestRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={8}
                          step={0.1}
                          value={interestRate}
                          onChange={(e) => setInterestRate(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      {/* Tilgung Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Tilgung</span>
                          <span className="text-gray-900 dark:text-white font-medium">{tilgungRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.5}
                          value={tilgungRate}
                          onChange={(e) => setTilgungRate(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Mietrendite und Instandhaltung Slider - nebeneinander */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Mietrendite Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Mietrendite</span>
                          <span className="text-gray-900 dark:text-white font-medium">{rentalYield}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={20}
                          step={0.5}
                          value={rentalYield}
                          onChange={(e) => setRentalYield(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      {/* Instandhaltung Slider */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Instandhaltung</span>
                          <span className="text-gray-900 dark:text-white font-medium">{maintenanceRate}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.1}
                          value={maintenanceRate}
                          onChange={(e) => setMaintenanceRate(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {taxTarget === 'optimal' && (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 mb-2">
                        <span>✓</span>
                        <span>Empfohlen für minimales EK</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">AfA-Satz Gebäude</span>
                      <span className="text-gray-900 dark:text-white">{defaultAfaRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Zinssatz</span>
                      <span className="text-gray-900 dark:text-white">{interestRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tilgung</span>
                      <span className="text-gray-900 dark:text-white">{tilgungRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Mietrendite</span>
                      <span className="text-gray-900 dark:text-white">{rentalYield}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Instandhaltung</span>
                      <span className="text-gray-900 dark:text-white">{maintenanceRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Eigenkapital</span>
                      {taxTarget === 'optimal' && optimalResult.data ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {optimalResult.data.requiredEquityPercent}% (berechnet)
                        </span>
                      ) : (
                        <span className="text-gray-900 dark:text-white">{equityRate}%</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center Column - Results */}
            <div className="lg:col-span-6 h-full min-h-0 overflow-y-auto pr-1">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                <TaxSavingsDisplay
                  targetPortfolioValue={targetPortfolioValue}
                  currentTax={annualTaxPaid}
                  optimizedTax={0}
                  isLoading={isCalculating}
                  marginalTaxRate={marginalTaxRate / 100}
                  strategy={strategy}
                  breakdown={taxTarget === 'optimal' ? optimalResult.data?.breakdown : calculationResult.data?.breakdown}
                  taxTarget={taxTarget}
                  interestRate={interestRate / 100}
                  tilgungRate={tilgungRate / 100}
                  rentalYield={rentalYield / 100}
                  maintenanceRate={maintenanceRate / 100}
                  equityRate={effectiveEquityRate / 100}
                  isOptimal={taxTarget === 'optimal'}
                  isCashflowNeutral={optimalResult.data?.isCashflowNeutral}
                  monthlyCashflow={optimalResult.data?.monthlyCashflow}
                />
              </div>
            </div>

            {/* Right Column - Properties */}
            <div className="lg:col-span-3 h-full min-h-0 overflow-y-auto pr-1">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 h-full flex flex-col">
                <div className="mb-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Passende Objekte</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Sortiert nach Steuerersparnis
                  </p>
                </div>

                <div className="flex-1 min-h-0">
                  {allProperties.isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : propertiesWithSavings.length > 0 ? (
                    <div className="space-y-3">
                      {propertiesWithSavings.map((property) => (
                        <PropertyMatchCard
                          key={property.id}
                          property={property}
                          taxSavings={property.taxSavings}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building2 size={40} className="mx-auto mb-3 text-gray-400 dark:text-gray-600" />
                      <p className="text-sm text-gray-500">
                        Keine Objekte gefunden.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
