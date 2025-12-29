'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';
import { TaxSavingsDisplay } from '../components/TaxSavingsDisplay';
import { Header } from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';

type AfaStrategy = 'bestand' | 'altbau' | 'neubau' | 'denkmal';

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
  const imageUrl = property.images?.[0] || '/placeholder-property.jpg';

  return (
    <Link
      href={`/property/${property.id}`}
      className="block bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-all hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      <div className="relative h-28">
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        {/* Badge */}
        <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
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

  // Was-wäre-wenn Slider state
  const [customPortfolioValue, setCustomPortfolioValue] = useState<number | null>(null);

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

  // Track changes to inputs - reset slider when tax data changes
  const handleInputChange = useCallback(() => {
    setCustomPortfolioValue(null);
  }, []);

  // Get the default AfA rate for the current strategy
  const defaultAfaRate = useMemo(() => {
    const rates: Record<AfaStrategy, number> = { bestand: 2, altbau: 2.5, neubau: 4, denkmal: 9 };
    return rates[strategy];
  }, [strategy]);

  // Handle strategy change - reset custom value
  const handleStrategyChange = useCallback((newStrategy: AfaStrategy) => {
    setStrategy(newStrategy);
    setCustomPortfolioValue(null); // Reset slider when strategy changes
  }, []);

  // Calculate the target portfolio value
  const calculationResult = trpc.taxOptimizer.calculate.useQuery(
    {
      annualTaxPaid,
      marginalTaxRate: marginalTaxRate / 100,
      strategy,
    },
    {
      enabled: annualTaxPaid > 0 && marginalTaxRate > 0,
    }
  );

  // Target portfolio value from calculation (for 0€ tax)
  const targetPortfolioValue = calculationResult.data?.targetPortfolioValue ?? 0;

  // Get all properties (independent of portfolio value)
  const allProperties = trpc.taxOptimizer.getAllPropertiesForTaxOptimizer.useQuery(
    { limit: 6 }
  );

  // Calculate tax savings for each property, filter by max savings, and sort (highest first)
  const propertiesWithSavings = useMemo(() => {
    if (!allProperties.data) return [];

    const buildingRatio = strategy === 'bestand' ? 0.8 : strategy === 'neubau' ? 0.85 : 0.9;
    const afaRate = defaultAfaRate / 100;
    const interestRate = 0.04;
    const rentalYield = 0.03;
    const maintenanceRate = 0.005;

    return allProperties.data
      .map((property: { id: string; price: number; title: string; location: string; sqm: number; rooms: number; images: string[]; ai_investment_score?: number }) => {
        const interestDeduction = property.price * 1.0 * interestRate;
        const depreciationDeduction = property.price * buildingRatio * afaRate;
        const maintenanceDeduction = property.price * maintenanceRate;
        const rentalIncome = property.price * rentalYield;
        const netTaxLoss = interestDeduction + depreciationDeduction + maintenanceDeduction - rentalIncome;
        const taxSavings = Math.round(netTaxLoss * (marginalTaxRate / 100));

        return {
          ...property,
          taxSavings,
        };
      })
      .filter((property) => property.taxSavings <= annualTaxPaid) // Only show properties where savings <= paid taxes
      .sort((a, b) => b.taxSavings - a.taxSavings); // Sort by savings descending
  }, [allProperties.data, strategy, marginalTaxRate, defaultAfaRate, annualTaxPaid]);

  const handleTaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setAnnualTaxPaid(value === '' ? 0 : Number(value));
  }, []);

  // Ziel Steuerlast State
  const [taxTarget, setTaxTarget] = useState<'zero' | 'half' | 'custom'>('zero');

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
            <div className="lg:col-span-3 h-full flex flex-col gap-4">
              {/* Deine Steuersituation Card */}
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex-1 overflow-y-auto">
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
                      className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-lg font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <input
                    type="range"
                    min={5000}
                    max={200000}
                    step={1000}
                    value={annualTaxPaid}
                    onChange={(e) => {
                      setAnnualTaxPaid(Number(e.target.value));
                      handleInputChange();
                    }}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5.000 €</span>
                    <span className="text-gray-500 dark:text-gray-400">ca. {formatCompact(annualTaxPaid / (marginalTaxRate / 100))} € Einkommen</span>
                    <span>200.000 €</span>
                  </div>
                </div>

                {/* Tax Rate Display with Slider */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Dein Grenzsteuersatz
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{marginalTaxRate}</span>
                    <span className="text-xl text-gray-500 dark:text-gray-400">%</span>
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
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>14%</span>
                    <span>42%</span>
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
                      onClick={() => setTaxTarget('zero')}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'zero'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      €0
                    </button>
                    <button
                      onClick={() => setTaxTarget('half')}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'half'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      50%
                    </button>
                    <button
                      onClick={() => setTaxTarget('custom')}
                      className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        taxTarget === 'custom'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                </div>
              </div>

              {/* Benötigtes AfA/Jahr Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/20 dark:to-teal-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Benötigtes AfA/Jahr</span>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-full">
                    {strategy === 'bestand' ? '2%' : strategy === 'altbau' ? '2,5%' : strategy === 'neubau' ? '4%' : '9%'} AfA
                  </span>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(Math.round(targetPortfolioValue * (strategy === 'denkmal' ? 0.35 : strategy === 'neubau' ? 0.85 : 0.8) * (defaultAfaRate / 100)))}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  um {formatCurrency(annualTaxPaid)} Steuern zu sparen
                </p>
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
                  <div className="mt-4 space-y-3">
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
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">AfA-Satz Gebäude</span>
                      <span className="text-gray-900 dark:text-white">{defaultAfaRate}% p.a.</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Gebäudeanteil</span>
                      <span className="text-gray-900 dark:text-white">80%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fremdfinanzierung</span>
                      <span className="text-gray-900 dark:text-white">80%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Center Column - Results */}
            <div className="lg:col-span-6 h-full">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 h-full flex flex-col overflow-y-auto">
                <TaxSavingsDisplay
                  targetPortfolioValue={targetPortfolioValue}
                  currentTax={annualTaxPaid}
                  optimizedTax={0}
                  isLoading={calculationResult.isLoading}
                  customPortfolioValue={customPortfolioValue}
                  onCustomPortfolioChange={setCustomPortfolioValue}
                  marginalTaxRate={marginalTaxRate / 100}
                  strategy={strategy}
                  breakdown={calculationResult.data?.breakdown}
                />
              </div>
            </div>

            {/* Right Column - Properties */}
            <div className="lg:col-span-3 h-full">
              <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-5 h-full flex flex-col overflow-y-auto">
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
