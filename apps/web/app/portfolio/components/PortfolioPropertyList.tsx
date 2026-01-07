'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronRight,
  Home,
  Building,
  Store,
  Users,
} from 'lucide-react';

interface PropertyMetrics {
  totalInvestment: number;
  currentValue: number;
  equity: number;
  monthlyLoanPayment: number;
  monthlyCashflow: number;
  annualCashflow: number;
  grossYield: number;
  cashOnCash: number;
  rentMultiplier: number;
}

interface PortfolioProperty {
  id: string;
  title: string;
  property_type: string | null;
  location: string;
  sqm: number;
  purchase_price: number;
  current_value: number | null;
  monthly_rent: number | null;
  monthly_fee: number | null;
  ai_score: number | null;
  metrics: PropertyMetrics;
}

interface TaxEffect {
  annualTaxEffect: number;
  monthlyTaxEffect: number;
  breakdown: {
    annualRent: number;
    annualInterest: number;
    annualAfa: number;
    taxableIncome: number;
  };
}

interface PortfolioPropertyListProps {
  properties: PortfolioProperty[];
  canAccessAnalytics: boolean;
  taxEffects?: Record<string, TaxEffect>;
  marginalTaxRate?: number;
}

// Format currency in German locale
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Get property type icon
const getPropertyIcon = (type: string | null) => {
  switch (type) {
    case 'house':
      return Home;
    case 'commercial':
      return Store;
    case 'multi_family':
      return Users;
    default:
      return Building;
  }
};

// Get property type label
const getPropertyTypeLabel = (type: string | null): string => {
  switch (type) {
    case 'apartment':
      return 'Wohnung';
    case 'house':
      return 'Haus';
    case 'commercial':
      return 'Gewerbe';
    case 'multi_family':
      return 'Mehrfamilienhaus';
    default:
      return 'Immobilie';
  }
};

// Get cashflow color
const getCashflowColor = (value: number): string => {
  return value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
};

// Get yield color
const getYieldColor = (value: number): string => {
  if (value >= 4) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 2) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-rose-600 dark:text-rose-400';
};

// Get AI score color (matching PropertyScoreBadge thresholds)
const getAiScoreColor = (value: number): string => {
  if (value >= 85) return 'text-green-600 dark:text-green-400'; // Sehr gut
  if (value >= 60) return 'text-emerald-600 dark:text-emerald-400'; // Gut
  if (value >= 40) return 'text-yellow-600 dark:text-yellow-400'; // OK
  return 'text-rose-600 dark:text-rose-400'; // Schwach
};

export function PortfolioPropertyList({
  properties,
  canAccessAnalytics,
  taxEffects,
  marginalTaxRate = 0.42,
}: PortfolioPropertyListProps) {
  const router = useRouter();

  return (
    <div className="grid gap-4">
      {properties.map((property) => {
        const PropertyIcon = getPropertyIcon(property.property_type);
        const metrics = property.metrics;

        return (
          <div
            key={property.id}
            onClick={() => router.push(`/portfolio/${property.id}`)}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all cursor-pointer group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Property Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0 group-hover:bg-gray-50 dark:group-hover:bg-gray-800 -m-2 p-2 rounded-xl transition-colors">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl group-hover:bg-[#FF385C]/10 transition-colors">
                  <PropertyIcon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-[#FF385C] transition-colors" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#FF385C] transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                    <MapPin size={14} />
                    <span className="truncate">{property.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors">
                    <span>{getPropertyTypeLabel(property.property_type)}</span>
                    <span>•</span>
                    <span>{property.sqm} m²</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 lg:gap-6">
                {/* Value */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Wert</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.currentValue)}
                  </p>
                </div>

                {/* Rendite */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Rendite</p>
                  <p className={`font-semibold ${getYieldColor(metrics.grossYield)}`}>
                    {metrics.grossYield.toFixed(1)}%
                  </p>
                </div>

                {/* Cashflow */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Cashflow</p>
                  <p className={`font-semibold ${getCashflowColor(metrics.monthlyCashflow)}`}>
                    {metrics.monthlyCashflow >= 0 ? '+' : ''}
                    {formatCurrency(metrics.monthlyCashflow)}
                  </p>
                </div>

                {/* Steuer-Effekt (Cashflow - AfA basiert, wie in Deal-Insights) */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Steuer</p>
                  {taxEffects && taxEffects[property.id] ? (
                    (() => {
                      const taxEffect = taxEffects[property.id];
                      const monthlyAfa = Math.round(taxEffect.breakdown.annualAfa / 12);
                      // Steuerliches Ergebnis = Cashflow - AfA
                      const steuerlichesErgebnis = metrics.monthlyCashflow - monthlyAfa;
                      // Steuereffekt = Steuerliches Ergebnis × Steuersatz
                      const steuereffektMonatlich = Math.round(steuerlichesErgebnis * marginalTaxRate);
                      // Negativ = Ersparnis (grün), Positiv = Zahlung (rot)
                      const isSaving = steuereffektMonatlich < 0;

                      return (
                        <p className={`font-semibold ${isSaving ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {isSaving ? '+' : ''}{formatCurrency(Math.abs(steuereffektMonatlich))}
                        </p>
                      );
                    })()
                  ) : (
                    <p className="font-semibold text-gray-400 dark:text-gray-500">–</p>
                  )}
                </div>

                {/* Equity or Faktor */}
                <div className="text-center lg:text-right">
                  {canAccessAnalytics ? (
                    <>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Eigenkapital</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(metrics.equity)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Faktor</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {metrics.rentMultiplier.toFixed(1)}x
                      </p>
                    </>
                  )}
                </div>

                {/* AI Score */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">AI-Score</p>
                  {property.ai_score != null ? (
                    <p className={`font-semibold ${getAiScoreColor(property.ai_score)}`}>
                      {(property.ai_score / 10).toFixed(1)}
                    </p>
                  ) : (
                    <p className="font-semibold text-gray-400 dark:text-gray-500">–</p>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden lg:flex items-center">
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF385C] group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
