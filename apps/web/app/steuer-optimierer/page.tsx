'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Calculator, Plus, Info, ChevronRight, Building2, Home, Check } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';
import { TaxStrategySelector, type AfaStrategy } from '../components/TaxStrategySelector';
import { TaxSavingsDisplay } from '../components/TaxSavingsDisplay';
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
        <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
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
          <span className="font-bold text-green-600">
            {formatCurrency(property.price)}
          </span>
          <span className="text-xs text-gray-500">
            {property.sqm} m² · {property.rooms} Zi.
          </span>
        </div>
        {taxSavings > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-green-600">
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
      const afaRate = strategy === 'bestand' ? 0.02 : strategy === 'neubau' ? 0.05 : 0.09;
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
  }, [matchingProperties.data, strategy, marginalTaxRate]);

  const handleTaxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '');
    setAnnualTaxPaid(value === '' ? 0 : Number(value));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Home className="text-green-600" size={24} />
            <span className="font-bold text-xl text-gray-900">Nestando</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900">
              Entdecken
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
              Preise
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Calculator size={16} />
            Steuer-Optimierer
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Wandle Steuern in Sachwerte
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Berechne, wie viel Immobilienbesitz du brauchst, um deine Steuerlast auf 0€ zu senken.
            Legale Steueroptimierung durch AfA und Werbungskosten.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-3 flex">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-6">
                <Plus className="text-green-600" size={20} />
                <h2 className="font-semibold text-gray-900">Dein Steuer-Optimierer</h2>
              </div>

              {/* Annual Tax Input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gezahlte Einkommensteuer pro Jahr
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formatNumber(annualTaxPaid)}
                    onChange={handleTaxChange}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-right text-lg font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    €
                  </span>
                </div>
              </div>

              {/* Tax Rate Input */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Persönlicher Grenzsteuersatz
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={marginalTaxRate}
                    onChange={(e) => setMarginalTaxRate(Number(e.target.value))}
                    min={14}
                    max={45}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-right text-lg font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Spitzensteuersatz: 42% ab 62.810€
                </p>
              </div>

              {/* Strategy Selector */}
              <div className="mb-5">
                <TaxStrategySelector
                  value={strategy}
                  onChange={setStrategy}
                  compact
                />
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
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Info size={16} />
                    Berechnungsdetails
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Zu offsettendes Einkommen</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(calculationResult.data.incomeToOffset)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">AfA-Abschreibung p.a.</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(calculationResult.data.breakdown.depreciationDeduction)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Zinsabzug p.a.</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(calculationResult.data.breakdown.interestDeduction)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-gray-500 text-xs mb-1">Mieteinnahmen p.a.</p>
                      <p className="font-semibold text-gray-900">
                        -{formatCurrency(calculationResult.data.breakdown.rentalIncome)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Disclaimer */}
              <div className="mt-auto pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  <strong>Hinweis:</strong> Diese Rechnung dient als erste Indikation und ersetzt keine steuerliche Beratung.
                  Die tatsächliche Steuerersparnis hängt von Ihrer individuellen Situation ab.
                  Wir empfehlen, einen Steuerberater zu konsultieren.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Properties */}
          <div className="lg:col-span-3 flex">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Passende Objekte finden</h3>
                <span className="text-xs text-gray-500">
                  {matchingProperties.data?.length || 0} gefunden
                </span>
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

              {/* Link to Portfolio */}
              <div className="mt-auto pt-4 border-t border-gray-100">
                <Link
                  href="/portfolio"
                  className="flex items-center justify-between text-sm text-green-600 hover:text-green-700"
                >
                  <span>Oder eine Portfolio-Übersicht ansehen</span>
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
