'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  TrendingUp,
  Wallet,
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
  metrics: PropertyMetrics;
}

interface PortfolioPropertyListProps {
  properties: PortfolioProperty[];
  canAccessAnalytics: boolean;
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
  return value >= 0 ? 'text-green-600' : 'text-red-600';
};

// Get yield color
const getYieldColor = (value: number): string => {
  if (value >= 4) return 'text-green-600';
  if (value >= 2) return 'text-yellow-600';
  return 'text-red-600';
};

export function PortfolioPropertyList({
  properties,
  canAccessAnalytics,
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
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group"
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Property Info */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-gray-200 transition-colors">
                  <PropertyIcon className="w-6 h-6 text-gray-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-[#FF385C] transition-colors">
                    {property.title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <MapPin size={14} />
                    <span className="truncate">{property.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>{getPropertyTypeLabel(property.property_type)}</span>
                    <span>•</span>
                    <span>{property.sqm} m²</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6">
                {/* Value */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Wert</p>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(metrics.currentValue)}
                  </p>
                </div>

                {/* Rendite */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Rendite</p>
                  <p className={`font-semibold ${getYieldColor(metrics.grossYield)}`}>
                    {metrics.grossYield.toFixed(1)}%
                  </p>
                </div>

                {/* Cashflow */}
                <div className="text-center lg:text-right">
                  <p className="text-xs text-gray-400 mb-0.5">Cashflow</p>
                  <p className={`font-semibold ${getCashflowColor(metrics.monthlyCashflow)}`}>
                    {metrics.monthlyCashflow >= 0 ? '+' : ''}
                    {formatCurrency(metrics.monthlyCashflow)}
                  </p>
                </div>

                {/* Equity or Faktor */}
                <div className="text-center lg:text-right">
                  {canAccessAnalytics ? (
                    <>
                      <p className="text-xs text-gray-400 mb-0.5">Eigenkapital</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(metrics.equity)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-gray-400 mb-0.5">Faktor</p>
                      <p className="font-semibold text-gray-900">
                        {metrics.rentMultiplier.toFixed(1)}x
                      </p>
                    </>
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
