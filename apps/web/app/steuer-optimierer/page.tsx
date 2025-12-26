'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calculator, Info, Building2, Check, Save, Pencil } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';
import { TaxStrategySelector, type AfaStrategy } from '../components/TaxStrategySelector';
import { TaxSavingsDisplay } from '../components/TaxSavingsDisplay';
import { Header } from '../components/Header';
import Link from 'next/link';
import Image from 'next/image';

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

// Property Card for matching properties
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
      className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="relative h-32">
        <Image
          src={imageUrl}
          alt={property.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        {/* Badge */}
        <div className="absolute top-2 right-2 bg-primary text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
          <Check size={12} />
          Geprüft
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">
          {property.title}
        </h4>
        <p className="text-xs text-gray-500 mb-2">{property.location}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-primary">
            {formatCurrency(property.price)}
          </span>
          <span className="text-xs text-gray-500">
            {property.sqm} m² · {property.rooms} Zi.
          </span>
        </div>
        {taxSavings > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-primary">
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
  const [annualTaxPaid, setAnnualTaxPaid] = useState<number>(30000);
  const [marginalTaxRate, setMarginalTaxRate] = useState<number>(42);
  const [strategy, setStrategy] = useState<AfaStrategy>('neubau');
  const [isUsingProfileValues, setIsUsingProfileValues] = useState(false);
  const [isEditingTax, setIsEditingTax] = useState(false);

  // Load user's tax profile
  const { data: taxProfile, isLoading: loadingProfile, refetch: refetchProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Mutation to save tax profile
  const upsertTaxProfile = trpc.taxOptimizer.upsertProfile.useMutation({
    onSuccess: () => {
      refetchProfile();
      setIsUsingProfileValues(true);
      setHasUnsavedChanges(false);
      setIsEditingTax(false);
    },
  });

  // Track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
      setIsUsingProfileValues(true);
    }
  }, [taxProfile]);

  // Handle saving tax profile
  const handleSaveProfile = async () => {
    await upsertTaxProfile.mutateAsync({
      annualTaxPaid,
      marginalTaxRate: marginalTaxRate / 100,
      preferredStrategy: strategy,
    });
  };

  // Track changes to inputs
  const handleInputChange = useCallback(() => {
    setIsUsingProfileValues(false);
    setHasUnsavedChanges(true);
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

  // Get matching properties
  const matchingProperties = trpc.taxOptimizer.getMatchingProperties.useQuery(
    {
      targetPrice: calculationResult.data?.targetPortfolioValue || 0,
      tolerance: 0.3,
      limit: 3,
    },
    {
      enabled: !!calculationResult.data?.targetPortfolioValue,
    }
  );

  // Calculate tax savings for each property
  const propertyTaxEffects = useMemo(() => {
    if (!matchingProperties.data) return [];
    return matchingProperties.data.map((property: { id: string; price: number }) => {
      // Simple calculation for property tax savings
      const buildingRatio = strategy === 'bestand' ? 0.8 : strategy === 'neubau' ? 0.85 : 0.9;
      const afaRate = defaultAfaRate / 100;
      const interestRate = 0.04;
      const rentalYield = 0.03;
      const maintenanceRate = 0.005;

      const interestDeduction = property.price * 1.0 * interestRate;
      const depreciationDeduction = property.price * buildingRatio * afaRate;
      const maintenanceDeduction = property.price * maintenanceRate;
      const rentalIncome = property.price * rentalYield;
      const netTaxLoss = interestDeduction + depreciationDeduction + maintenanceDeduction - rentalIncome;
      const taxSavings = netTaxLoss * (marginalTaxRate / 100);

      return {
        propertyId: property.id,
        taxSavings: Math.round(taxSavings),
      };
    });
  }, [matchingProperties.data, strategy, marginalTaxRate, defaultAfaRate]);

  const handleTaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setAnnualTaxPaid(value === '' ? 0 : Number(value));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Wandle Steuern in Sachwerte
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Berechne, wie viel Immobilienbesitz du brauchst, um deine Steuerlast auf 0€ zu senken.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-3 flex">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Dein Steuer-Optimierer
              </h3>

              {/* Tax Settings - Compact View or Edit Mode */}
              {isEditingTax ? (
                /* Edit Mode */
                <div className="mb-5 space-y-4">
                  {/* Annual Tax Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gezahlte Einkommensteuer pro Jahr
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formatNumber(annualTaxPaid)}
                        onChange={(e) => {
                          handleTaxChange(e);
                          handleInputChange();
                        }}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right text-lg font-medium"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        €
                      </span>
                    </div>
                  </div>

                  {/* Tax Rate Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Persönlicher Grenzsteuersatz
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={marginalTaxRate || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d]/g, '');
                          setMarginalTaxRate(val === '' ? 0 : Math.min(45, Math.max(0, Number(val))));
                          handleInputChange();
                        }}
                        className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none text-right text-lg font-medium"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Spitzensteuersatz: 42% ab 62.810€
                    </p>
                  </div>

                  {/* Save/Cancel Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsEditingTax(false);
                        // Reset to profile values if available
                        if (taxProfile) {
                          if (taxProfile.annual_tax_paid) {
                            setAnnualTaxPaid(Number(taxProfile.annual_tax_paid));
                          }
                          if (taxProfile.marginal_tax_rate) {
                            setMarginalTaxRate(Math.round(Number(taxProfile.marginal_tax_rate) * 100));
                          }
                        }
                        setHasUnsavedChanges(false);
                      }}
                      className="flex-1 py-2.5 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={upsertTaxProfile.isLoading}
                      className="flex-1 py-2.5 bg-primary text-white font-medium rounded-lg transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      {upsertTaxProfile.isLoading ? 'Speichern...' : 'Speichern'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Compact Display Mode */
                <div className="mb-5 bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-600">Deine Steuerdaten</span>
                    <button
                      onClick={() => setIsEditingTax(true)}
                      className="flex items-center gap-1 text-sm text-primary hover:opacity-80 font-medium"
                    >
                      <Pencil size={14} />
                      Ändern
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Gezahlte Steuern p.a.</span>
                      <span className="font-semibold text-gray-900">{formatNumber(annualTaxPaid)} €</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Grenzsteuersatz</span>
                      <span className="font-semibold text-gray-900">{marginalTaxRate}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Strategy Selector */}
              <div className="mb-5">
                <TaxStrategySelector
                  value={strategy}
                  onChange={handleStrategyChange}
                  compact
                />
              </div>

              {/* Disclaimer */}
              <div className="mt-auto pt-4 border-t border-gray-100">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong className="text-amber-800">Hinweis:</strong> Diese Rechnung dient als erste Indikation und ersetzt keine steuerliche Beratung.
                    Die tatsächliche Steuerersparnis hängt von Ihrer individuellen Situation ab.
                    Wir empfehlen, einen Steuerberater zu konsultieren.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Center Column - Results */}
          <div className="lg:col-span-6 flex">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col">
              <TaxSavingsDisplay
                targetPortfolioValue={calculationResult.data?.targetPortfolioValue || 0}
                currentTax={annualTaxPaid}
                optimizedTax={0}
                isLoading={calculationResult.isLoading}
              />

              {/* Breakdown Details */}
              {calculationResult.data && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Info size={16} />
                    Berechnungsdetails
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    {/* Zu versteuerndes Einkommen */}
                    <div className="flex justify-between items-center pb-2 border-b border-gray-300">
                      <span className="text-gray-700 font-medium">Zu versteuerndes Einkommen</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(calculationResult.data.incomeToOffset)}
                      </span>
                    </div>

                    {/* AfA-Abschreibung */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">+ AfA-Abschreibung p.a.</span>
                        <span className="text-xs text-gray-400">
                          ({defaultAfaRate}%{strategy === 'denkmal' ? ' auf ~35% Sanier.' : ''})
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(calculationResult.data.breakdown.depreciationDeduction)}
                      </span>
                    </div>

                    {/* Zinsabzug */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">+ Zinsabzug p.a.</span>
                        <span className="text-xs text-gray-400">(4% Zinssatz)</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(calculationResult.data.breakdown.interestDeduction)}
                      </span>
                    </div>

                    {/* Instandhaltung */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">+ Instandhaltung p.a.</span>
                        <span className="text-xs text-gray-400">(0,5%)</span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(calculationResult.data.breakdown.maintenanceDeduction)}
                      </span>
                    </div>

                    {/* Mieteinnahmen */}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">− Mieteinnahmen p.a.</span>
                        <span className="text-xs text-gray-400">(3% vom Portfolio)</span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(calculationResult.data.breakdown.rentalIncome)}
                      </span>
                    </div>

                    {/* Separator */}
                    <div className="border-t-2 border-gray-300 my-2"></div>

                    {/* Netto-Verlust */}
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-900 font-bold">Netto-Verlust:</span>
                      <span className="font-bold text-gray-900">
                        {formatCurrency(calculationResult.data.breakdown.netTaxLoss)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Right Column - Properties */}
          <div className="lg:col-span-3 flex">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Passende Objekte</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {matchingProperties.data?.length || 0} Objekte gefunden
                </p>
              </div>

              <div className="flex-1">
                {matchingProperties.isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : matchingProperties.data && matchingProperties.data.length > 0 ? (
                  <div className="space-y-4">
                    {matchingProperties.data.map((property: { id: string; title: string; price: number; location: string; sqm: number; rooms: number; images: string[]; ai_investment_score?: number }) => {
                      const effect = propertyTaxEffects.find(
                        (e: { propertyId: string; taxSavings: number }) => e.propertyId === property.id
                      );
                      return (
                        <PropertyMatchCard
                          key={property.id}
                          property={property}
                          taxSavings={effect?.taxSavings || 0}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm">
                      Keine passenden Objekte gefunden.
                      <br />
                      Probiere eine andere Strategie.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
