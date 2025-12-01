'use client';

import React from 'react';
import { MapPin, ChartNoAxesCombined } from 'lucide-react';
import { InvestmentScoreCard } from '@immoflow/ui';

export interface PropertyPreviewData {
  images: string[];
  price: number;
  commission_rate?: number;
  location: string;
  address?: string;
  title: string;
  type?: string;
  sqm: number;
  rooms: number;
  description: string;
  features?: string[];
  yield?: number;
  highlights?: string[];
  red_flags?: string[];
  ai_investment_score?: number;
  require_address_consent?: boolean;
  evaluation?: {
    location_score: number;
    price_score: number;
    yield_score: number;
    appreciation_score: number;
    features_score: number;
    price_per_sqm: number;
    estimated_monthly_rent: number;
    gross_yield_percentage: number;
  };
}

export interface PropertyPreviewProps {
  data: PropertyPreviewData;
  className?: string;
  showAddress?: boolean;
  onRequestAddress?: () => void;
  showInvestmentScore?: boolean;
}

/**
 * Wiederverwendbare Live-Vorschau Komponente für Immobilien
 * Verwendet in: Create Listing, Edit Property
 */
export function PropertyPreview({
  data,
  className = '',
  showAddress = false,
  onRequestAddress,
  showInvestmentScore = true,
}: PropertyPreviewProps) {
  const formatPrice = (price: number) => {
    if (!price || price === 0) return '€ 0';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const pricePerSqm = data.sqm > 0 ? Math.round(data.price / data.sqm) : 0;

  // Determine if we should show address
  const shouldShowAddress = showAddress || !(data.require_address_consent ?? false);

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      {/* Property Details */}
      <div className="p-6 lg:p-8">
        {/* Type Badge */}
        {data.type && data.type !== 'Immobilie' && (
          <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium mb-3">
            {data.type}
          </span>
        )}

        {/* Price */}
        <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '33px' }}>
          {data.price > 0 ? formatPrice(data.price) : 'Preis nicht angegeben'}
        </h1>

        {/* Commission */}
        {data.commission_rate && data.commission_rate > 0 && (
          <p className="text-base text-gray-600 mb-4">
            zzgl. {data.commission_rate}% Provision
          </p>
        )}

        {/* Location */}
        {data.location && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={18} />
              <span style={{ fontSize: '18px' }}>
                {data.location}
                {shouldShowAddress && data.address && ` • ${data.address}`}
              </span>
            </div>
            {!shouldShowAddress && data.address && onRequestAddress && (
              <button
                onClick={onRequestAddress}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Vollständige Adresse anzeigen
              </button>
            )}
          </div>
        )}

        {/* Title */}
        {data.title && (
          <h2 className="font-semibold text-gray-900 mb-6" style={{ fontSize: '22px' }}>
            {data.title}
          </h2>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500">Zimmer</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.rooms > 0 ? data.rooms : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Fläche</p>
            <p className="text-lg font-semibold text-gray-900">
              {data.sqm > 0 ? `${data.sqm} m²` : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Preis/m²</p>
            <p className="text-lg font-semibold text-gray-900">
              {pricePerSqm > 0 ? formatPrice(pricePerSqm) : '-'}
            </p>
          </div>
        </div>

        {/* Yield */}
        {data.yield && (
          <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-200">
            <ChartNoAxesCombined size={20} className="text-gray-700" />
            <span className="text-lg font-semibold text-gray-900">{data.yield}% Rendite</span>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Beschreibung</h3>
            <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
              {data.description}
            </p>
          </div>
        )}

        {/* Features */}
        {data.features && data.features.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausstattung</h3>
            <div className="flex flex-wrap gap-2">
              {data.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-full text-base font-medium"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AI Investment Evaluation */}
        {showInvestmentScore && (data.ai_investment_score || data.evaluation) && (
          <div className="mb-6">
            <InvestmentScoreCard
              score={data.ai_investment_score}
              breakdown={
                data.evaluation
                  ? {
                      location_score: data.evaluation.location_score,
                      price_score: data.evaluation.price_score,
                      yield_score: data.evaluation.yield_score,
                      appreciation_score: data.evaluation.appreciation_score,
                      features_score: data.evaluation.features_score,
                    }
                  : undefined
              }
              metrics={
                data.evaluation
                  ? {
                      price_per_sqm: data.evaluation.price_per_sqm,
                      estimated_monthly_rent: data.evaluation.estimated_monthly_rent,
                      gross_yield_percentage: data.evaluation.gross_yield_percentage,
                    }
                  : undefined
              }
            />
          </div>
        )}

        {/* Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Highlights</h3>
            <ul className="space-y-2">
              {data.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700" style={{ fontSize: '18px' }}>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {data.red_flags && data.red_flags.length > 0 && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Zu beachten</h3>
            <ul className="space-y-2">
              {data.red_flags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 text-amber-600">
                  <span>⚠️</span>
                  <span style={{ fontSize: '18px' }}>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {!data.title && !data.location && !data.description && data.price === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              Die Vorschau wird aktualisiert, sobald Sie Informationen eingeben
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
