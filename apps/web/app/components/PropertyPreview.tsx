'use client';

import React, { useState } from 'react';
import { MapPin, ChartNoAxesCombined, Bath, Sparkles, DoorClosed, Square, Layers, Euro, Calendar, Building2, Clock, Flame, Zap, ChevronDown, MessageCircle } from 'lucide-react';
import { AIInvestmentEvaluation } from '@immoflow/ui';
import { InvestmentScoreBadge } from './InvestmentScoreBadge';

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
  actual_monthly_rent?: number;
  monthly_fee?: number;
  usable_area?: number;
  usable_area_ratio?: string;
  bathrooms?: number;
  total_floors?: number;
  floor_level?: string;
  available_from?: string;
  year_built?: number;
  heating_type?: string;
  energy_source?: string;
  energy_certificate?: string;
  energy_efficiency_class?: string;
  condition?: string;
  important_notes?: string;
  days_online?: number;
  yield_metrics?: {
    brutto_rendite?: number;
    netto_rendite?: number;
    ek_rendite?: number;
    faktor?: number;
    monthly_cashflow?: number;
  };
  rental_income?: {
    monthly_rent?: number;
    rent_per_sqm?: number;
    estimated_market_rent?: number;
    annual_rent?: number;
  };
  cashflow_calculation?: {
    rental_income?: number;
    non_transferable_fee?: number;
    maintenance_reserve?: number;
    loan_payment?: number;
    loan_details?: string;
    monthly_cashflow?: number;
  };
  evaluation?: {
    location_score: number;
    price_score: number;
    yield_score: number;
    appreciation_score: number;
    features_score: number;
    price_per_sqm: number;
    market_average_price_per_sqm?: number;
    estimated_monthly_rent: number;
    gross_yield_percentage: number;
    // AI Analysis texts
    location_analysis?: string;
    market_analysis?: string;
    rent_analysis?: string;
    financing_analysis?: string;
    // Interest rates
    interest_rate_90?: number;
    interest_rate_80?: number;
  };
  ai_recommendation?: {
    is_good_investment: boolean;
    summary: string;
    recommended_price?: number;
  };
  owner?: {
    first_name?: string;
    last_name?: string;
    company?: string;
    avatar_url?: string;
  };
}

export interface PropertyPreviewProps {
  data: PropertyPreviewData;
  className?: string;
  showAddress?: boolean;
  onRequestAddress?: () => void;
  showInvestmentScore?: boolean;
  isGeneratingEvaluation?: boolean;
  hasConsent?: boolean;
  isOwner?: boolean;
  consentLoading?: boolean;
  isUserLoggedIn?: boolean;
  onGrantConsent?: () => void;
  showConsentSection?: boolean;
  propertyId?: string;
  onTriggerEvaluation?: () => void;
  showEvaluationButton?: boolean;
  // Investment Analysis Button
  showInvestmentAnalysisButton?: boolean;
  onTriggerInvestmentAnalysis?: () => void;
  isGeneratingInvestmentAnalysis?: boolean;
  // Primary CTAs
  showCTAs?: boolean;
  onContactAgent?: () => void;
  onAddToFavorites?: () => void;
  isFavorite?: boolean;
  // Status Badge (for my-properties)
  statusBadge?: {
    label: string;
    bg: string;
    text: string;
  };
  // Hide provider info (for my-properties)
  hideProviderInfo?: boolean;
  // Seller analysis market average (for my-properties)
  sellerAnalysisMarketAverage?: number;
}

/**
 * Wiederverwendbare Live-Vorschau Komponente für Immobilien
 * Verwendet in: Create Listing, Edit Property
 */
const HEATING_TYPE_LABELS: Record<string, string> = {
  central: 'Zentralheizung',
  floor: 'Fußbodenheizung',
  gas: 'Gasheizung',
  heat_pump: 'Wärmepumpe',
  district: 'Fernwärme',
  other: 'Sonstige',
};

const ENERGY_SOURCE_LABELS: Record<string, string> = {
  gas: 'Gas',
  oil: 'Öl',
  electricity: 'Strom',
  district_heating: 'Fernwärme',
  solar: 'Solar',
  geothermal: 'Geothermie',
  biomass: 'Biomasse',
  other: 'Sonstige',
};

const ENERGY_CERTIFICATE_LABELS: Record<string, string> = {
  demand: 'Bedarfsausweis',
  consumption: 'Verbrauchsausweis',
  none: 'Nicht vorhanden',
};

const ENERGY_EFFICIENCY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'A+': { bg: 'bg-[#00963f]', border: 'border-[#00963f]', text: 'text-white' },
  'A': { bg: 'bg-[#49ba3d]', border: 'border-[#49ba3d]', text: 'text-white' },
  'B': { bg: 'bg-[#8cc63e]', border: 'border-[#8cc63e]', text: 'text-white' },
  'C': { bg: 'bg-[#ffd100]', border: 'border-[#ffd100]', text: 'text-gray-900' },
  'D': { bg: 'bg-[#f8ae00]', border: 'border-[#f8ae00]', text: 'text-white' },
  'E': { bg: 'bg-[#f17f00]', border: 'border-[#f17f00]', text: 'text-white' },
  'F': { bg: 'bg-[#e6001f]', border: 'border-[#e6001f]', text: 'text-white' },
  'G': { bg: 'bg-[#c20018]', border: 'border-[#c20018]', text: 'text-white' },
  'H': { bg: 'bg-[#991619]', border: 'border-[#991619]', text: 'text-white' },
};

const CONDITION_LABELS: Record<string, string> = {
  first_occupancy: 'Erstbezug',
  like_new: 'Neuwertig',
  modernized: 'Modernisiert',
  renovated: 'Saniert',
  well_maintained: 'Gepflegt',
  needs_renovation: 'Renovierungsbedürftig',
};

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  first_occupancy: { bg: 'bg-green-100', text: 'text-green-800' },
  like_new: { bg: 'bg-green-100', text: 'text-green-800' },
  modernized: { bg: 'bg-blue-100', text: 'text-blue-800' },
  renovated: { bg: 'bg-blue-100', text: 'text-blue-800' },
  well_maintained: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  needs_renovation: { bg: 'bg-orange-100', text: 'text-orange-800' },
};

const AVAILABLE_FROM_LABELS: Record<string, string> = {
  sofort: 'Sofort verfügbar',
  nach_vereinbarung: 'Nach Vereinbarung',
};

export function PropertyPreview({
  data,
  className = '',
  showAddress = false,
  onRequestAddress,
  showInvestmentScore = true,
  isGeneratingEvaluation = false,
  hasConsent = false,
  isOwner = false,
  consentLoading = false,
  isUserLoggedIn = false,
  onGrantConsent,
  showConsentSection = true,
  propertyId,
  onTriggerEvaluation,
  showEvaluationButton = false,
  showInvestmentAnalysisButton = false,
  onTriggerInvestmentAnalysis,
  isGeneratingInvestmentAnalysis = false,
  showCTAs = false,
  onContactAgent,
  onAddToFavorites,
  isFavorite = false,
  statusBadge,
  hideProviderInfo = false,
  sellerAnalysisMarketAverage,
}: PropertyPreviewProps) {
  // State for rental income accordion
  const [isRentalIncomeExpanded, setIsRentalIncomeExpanded] = useState(false);
  // State for cashflow accordion
  const [isCashflowExpanded, setIsCashflowExpanded] = useState(false);
  // State for weitere details accordion
  const [isWeitereDetailsExpanded, setIsWeitereDetailsExpanded] = useState(false);
  // State for description accordion
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // State for AI evaluation accordion
  const [isAIEvaluationExpanded, setIsAIEvaluationExpanded] = useState(false);
  // State for highlights and red flags accordion
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(true);

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

  // Helper to get German property type label
  const getPropertyTypeLabel = (type?: string): string => {
    switch (type) {
      case 'apartment':
        return 'Wohnung';
      case 'house':
        return 'Haus';
      case 'villa':
        return 'Villa';
      case 'commercial':
        return 'Gewerbe';
      case 'land':
        return 'Grundstück';
      case 'office':
        return 'Büro';
      case 'retail':
        return 'Einzelhandel';
      case 'industrial':
        return 'Industrie';
      case 'parking':
        return 'Stellplatz';
      case 'multi_family':
        return 'Mehrfamilienhaus';
      default:
        return 'Immobilie';
    }
  };

  // Generate dynamic property title from data
  const getPropertyTitle = (): string => {
    const typeLabel = getPropertyTypeLabel(data.type);
    const location = data.location.replace(/\s+/g, '-');
    const rooms = data.rooms;

    // For properties with rooms, use compact format: "2-Zi. Wohnung München-Schwabing"
    if (rooms && rooms > 0) {
      return `${rooms}-Zi. ${typeLabel} ${location}`;
    }

    // For land or properties without rooms: "Grundstück München-Pasing"
    return `${typeLabel} ${location}`;
  };

  // Determine if we should show address
  const shouldShowAddress = showAddress || !(data.require_address_consent ?? false);

  // Get formatted heating type
  const heatingTypeLabel = data.heating_type ? HEATING_TYPE_LABELS[data.heating_type] || data.heating_type : '-';

  // Get formatted energy source
  const energySourceLabel = data.energy_source ? ENERGY_SOURCE_LABELS[data.energy_source] || data.energy_source : '-';

  // Get formatted energy certificate
  const energyCertificateLabel = data.energy_certificate ? ENERGY_CERTIFICATE_LABELS[data.energy_certificate] || data.energy_certificate : '-';

  // Get formatted available from
  const availableFromLabel = data.available_from
    ? (AVAILABLE_FROM_LABELS[data.available_from] || data.available_from)
    : '-';

  // Get energy efficiency colors (no fallback - only show if data exists)
  const energyEfficiencyClass = data.energy_efficiency_class;
  const energyColors = energyEfficiencyClass ? ENERGY_EFFICIENCY_COLORS[energyEfficiencyClass] : null;

  // Get condition label and colors (no fallback - only show if data exists)
  const condition = data.condition;
  const conditionLabel = condition ? CONDITION_LABELS[condition] : null;
  const conditionColors = condition ? CONDITION_COLORS[condition] : null;

  // Format floor/total floors
  const floorDisplay = data.floor_level && data.total_floors
    ? `${data.floor_level} / ${data.total_floors}`
    : data.floor_level || '-';

  return (
    <div className={`bg-white rounded-2xl ${className} relative ${className.includes('!bg-transparent') ? '' : 'px-4 md:px-6'}`}>
      {/* Sticky Badges - Top Right */}
      {(statusBadge || data.days_online !== undefined) ? (
        <div className="sticky top-4 z-10 flex justify-end gap-2 mb-4">
          {/* Days Online Badge */}
          {data.days_online !== undefined && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <Clock size={16} />
              {data.days_online === 0 ? 'Heute online' :
               data.days_online === 1 ? 'Seit 1 Tag online' :
               data.days_online < 7 ? `Seit ${data.days_online} Tagen online` :
               data.days_online < 30 ? `Seit ${Math.floor(data.days_online / 7)} ${Math.floor(data.days_online / 7) === 1 ? 'Woche' : 'Wochen'} online` :
               `Seit ${Math.floor(data.days_online / 30)} ${Math.floor(data.days_online / 30) === 1 ? 'Monat' : 'Monaten'} online`}
            </span>
          )}

          {/* Status Badge */}
          {statusBadge && (
            <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>
              {statusBadge.label}
            </span>
          )}
        </div>
      ) : null}

      {/* Property Details */}
      <div>
        {/* Property Title (Rooms + Type + Location) */}
        <h2 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '22px' }}>
          {getPropertyTitle()}
        </h2>

        {/* Location */}
        <div className="mb-6">
          {(() => {
            // Build full address for Google Maps
            const fullAddress = shouldShowAddress && data.address
              ? `${data.address}, ${data.location}`
              : data.location;
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

            return (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors cursor-pointer w-fit"
              >
                <MapPin size={18} />
                <span style={{ fontSize: '18px' }}>
                  {data.location || '-'}
                  {shouldShowAddress && data.address && ` • ${data.address}`}
                </span>
              </a>
            );
          })()}
        </div>

        {/* Price Card */}
        <div className="mb-6 p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Price and Price per sqm - Side by Side */}
          <div className="flex justify-between items-start mb-4">
            {/* Left: Kaufpreis */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Kaufpreis</p>
              <h1 className="font-bold text-gray-900" style={{ fontSize: '40px', lineHeight: '1' }}>
                {data.price > 0 ? formatPrice(data.price) : '-'}
              </h1>
            </div>

            {/* Right: Preis pro m² */}
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-2">Preis pro m²</p>
              <h2 className="font-bold text-gray-900" style={{ fontSize: '32px', lineHeight: '1' }}>
                {pricePerSqm > 0 ? formatPrice(pricePerSqm) : '-'}
              </h2>
            </div>
          </div>

          {/* Commission */}
          {data.commission_rate && data.commission_rate > 0 && (
            <p className="text-base text-gray-600 mt-4">
              zzgl. {data.commission_rate}% Provision
            </p>
          )}

          {/* Market Average - Dynamic Comparison - Only show if market data exists */}
          {(sellerAnalysisMarketAverage || data.evaluation?.market_average_price_per_sqm) && (() => {
            // Use seller analysis market average if available, otherwise fall back to evaluation
            const marketAvgPrice = sellerAnalysisMarketAverage || data.evaluation?.market_average_price_per_sqm || 0;
            const propertyPrice = pricePerSqm;
            const difference = ((propertyPrice - marketAvgPrice) / marketAvgPrice) * 100;
            const percentDiff = Math.abs(Math.round(difference));

            // Determine market position (within 3% is considered equal)
            let marketPosition: 'under' | 'equal' | 'over';
            if (percentDiff <= 3) {
              marketPosition = 'equal';
            } else if (difference < 0) {
              marketPosition = 'under';
            } else {
              marketPosition = 'over';
            }

            const getMarketPositionDisplay = () => {
              switch (marketPosition) {
                case 'equal':
                  return {
                    color: 'text-blue-600',
                    iconColor: 'text-blue-600',
                    text: `Entspricht dem Markt-Durchschnitt (${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(marketAvgPrice)}/m²)`,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-blue-600">
                        <path
                          d="M3 8H13M8 3H13M8 13H13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  };
                case 'under':
                  return {
                    color: 'text-green-600',
                    iconColor: 'text-green-600',
                    text: `${percentDiff}% unter Markt-Durchschnitt (${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(marketAvgPrice)}/m²)`,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-green-600">
                        <path
                          d="M8 3L8 13M8 3L4 7M8 3L12 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  };
                case 'over':
                  return {
                    color: 'text-red-600',
                    iconColor: 'text-red-600',
                    text: `${percentDiff}% über Markt-Durchschnitt (${new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(marketAvgPrice)}/m²)`,
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-red-600">
                        <path
                          d="M8 13L8 3M8 13L4 9M8 13L12 9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ),
                  };
              }
            };

            const display = getMarketPositionDisplay();

            return (
              <div className="flex items-center gap-2 mt-2">
                {display.icon}
                <span className={`text-sm font-medium ${display.color}`}>
                  {display.text}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Weitere Details Section - Compact Accordion */}
        {(data.sqm || data.rooms || energyEfficiencyClass || data.available_from || data.year_built || data.bathrooms || data.monthly_fee || data.floor_level || data.total_floors || data.heating_type || data.energy_source || data.energy_certificate || data.usable_area || condition) && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Always Visible - Icons and Values Only */}
            <div className="p-6 flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-6 items-center">
                {/* Living Area */}
                {data.sqm && data.sqm > 0 && (
                  <div className="flex items-center gap-2">
                    <Square size={20} className="text-green-600" />
                    <span className="text-base font-semibold text-gray-900">{data.sqm} m²</span>
                  </div>
                )}

                {/* Rooms */}
                {data.rooms && data.rooms > 0 && (
                  <div className="flex items-center gap-2">
                    <DoorClosed size={20} className="text-green-600" />
                    <span className="text-base font-semibold text-gray-900">{data.rooms} Zimmer</span>
                  </div>
                )}

                {/* Energy Efficiency Class */}
                {energyEfficiencyClass && (
                  <div className="flex items-center gap-2">
                    <Zap size={20} className="text-yellow-600" />
                    <span className="text-base font-semibold text-gray-900">Energie: {energyEfficiencyClass}</span>
                  </div>
                )}

                {/* Year Built */}
                {data.year_built && (
                  <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-gray-600" />
                    <span className="text-base font-semibold text-gray-900">{data.year_built}</span>
                  </div>
                )}
              </div>

              {/* Expand/Collapse Button */}
              {(data.bathrooms || data.year_built || conditionLabel || data.monthly_fee || data.floor_level || data.total_floors || data.heating_type || data.energy_source || data.energy_certificate || data.usable_area) && (
                <button
                  onClick={() => setIsWeitereDetailsExpanded(!isWeitereDetailsExpanded)}
                  className="flex items-center transition-colors flex-shrink-0"
                >
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isWeitereDetailsExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
              )}
            </div>

            {/* Expanded Details - Show on Click */}
            {isWeitereDetailsExpanded && (
              <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* === WICHTIGSTE MERKMALE === */}

                  {/* Living Area */}
                  {data.sqm && data.sqm > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <Square size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Wohnfläche</p>
                        <p className="text-base font-semibold text-gray-900">{data.sqm} m²</p>
                      </div>
                    </div>
                  )}

                  {/* Rooms */}
                  {data.rooms && data.rooms > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <DoorClosed size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Zimmer</p>
                        <p className="text-base font-semibold text-gray-900">{data.rooms}</p>
                      </div>
                    </div>
                  )}

                  {/* Energy Efficiency Class */}
                  {energyEfficiencyClass && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                        <Zap size={20} className="text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Energieeffizienzklasse</p>
                        <p className="text-base font-semibold text-gray-900">{energyEfficiencyClass}</p>
                      </div>
                    </div>
                  )}

                  {/* Year Built */}
                  {data.year_built && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                        <Building2 size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Baujahr</p>
                        <p className="text-base font-semibold text-gray-900">{data.year_built}</p>
                      </div>
                    </div>
                  )}

                  {/* Bathrooms */}
                  {data.bathrooms && data.bathrooms > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Bath size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Badezimmer</p>
                        <p className="text-base font-semibold text-gray-900">{data.bathrooms}</p>
                      </div>
                    </div>
                  )}

                  {/* Condition */}
                  {conditionLabel && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Sparkles size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Zustand</p>
                        <p className="text-base font-semibold text-gray-900">{conditionLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Monthly Fee */}
                  {data.monthly_fee && data.monthly_fee > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <Euro size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Hausgeld</p>
                        <p className="text-base font-semibold text-gray-900">
                          {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.monthly_fee)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Available From */}
                  {data.available_from && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                        <Clock size={20} className="text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Verfügbar ab</p>
                        <p className="text-base font-semibold text-gray-900">{availableFromLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* === ZUSÄTZLICHE DETAILS === */}

                  {/* Floor Level */}
                  {(data.floor_level || data.total_floors) && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        <Building2 size={20} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Geschoss</p>
                        <p className="text-base font-semibold text-gray-900">{floorDisplay}</p>
                      </div>
                    </div>
                  )}

                  {/* Heating Type */}
                  {data.heating_type && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                        <Flame size={20} className="text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Heizungsart</p>
                        <p className="text-base font-semibold text-gray-900">{heatingTypeLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Energy Source */}
                  {data.energy_source && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                        <Zap size={20} className="text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Energiequelle</p>
                        <p className="text-base font-semibold text-gray-900">{energySourceLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Energy Certificate */}
                  {data.energy_certificate && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                        <Zap size={20} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Energieausweis</p>
                        <p className="text-base font-semibold text-gray-900">{energyCertificateLabel}</p>
                      </div>
                    </div>
                  )}

                  {/* Usable Area */}
                  {data.usable_area && data.usable_area > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                        <Layers size={20} className="text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nutzfläche</p>
                        <p className="text-base font-semibold text-gray-900">{data.usable_area} m²</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description - Accordion */}
        {data.description && (() => {
          // Split description into sentences (1-2 sentences for preview)
          const sentences = data.description.split(/(?<=[.!?])\s+/);
          const previewSentences = sentences.slice(0, 2).join(' ');
          const remainingSentences = sentences.slice(2).join(' ');
          const hasMoreContent = remainingSentences.length > 0;

          return (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header with Important Notes or Preview */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Beschreibung</h3>
                  {hasMoreContent && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="flex items-center transition-colors flex-shrink-0"
                    >
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>
                  )}
                </div>

                {/* Important Notes as Header - Show if exists */}
                {data.important_notes && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {data.important_notes}
                    </p>
                  </div>
                )}

                {/* If no important_notes, show first 1-2 sentences in header */}
                {!data.important_notes && (
                  <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                    {previewSentences}
                  </p>
                )}
              </div>

              {/* Expanded Description Text - Show remaining content */}
              {isDescriptionExpanded && hasMoreContent && (
                <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                  <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                    {remainingSentences}
                  </p>
                </div>
              )}

              {/* If important_notes exists, show full description in expanded panel */}
              {isDescriptionExpanded && data.important_notes && (
                <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                  <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                    {data.description}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Investment Analysis Button - Show when essential data is available */}
        {showInvestmentAnalysisButton && onTriggerInvestmentAnalysis && (
          <div className="mb-6">
            {isGeneratingInvestmentAnalysis ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">KI-Analyse läuft...</h3>
                    <p className="text-sm text-gray-600">Die Immobilie wird aus Investoren-Sicht analysiert</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-sm text-indigo-700 ml-2">
                    Analysiere Rendite, Cashflow, Marktmiete und Finanzierung...
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={onTriggerInvestmentAnalysis}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group"
              >
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Wie sehen Investoren deine Immobilie?</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Mieteinnahmen and Cashflow sections moved inside AI-Invest-Score accordion */}

        {/* KI-Investment-Bewertung Section removed - only detailed AI Investment-Bewertung shown now */}

        {/* AI Evaluation Button - Show if evaluation hasn't been run yet or user wants to re-run */}
        {showEvaluationButton && onTriggerEvaluation && (
          <div className="mb-6">
            {isGeneratingEvaluation ? (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">KI-Analyse läuft...</h3>
                    <p className="text-sm text-gray-600">Die Immobilie wird analysiert</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <span className="text-sm text-indigo-700 ml-2">
                    Analysiere Lage, Preis, Rendite und Wertsteigerungspotential...
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={onTriggerEvaluation}
                disabled={isGeneratingEvaluation}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
              >
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>KI-Investment-Analyse starten</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* AI Investment Evaluation - Accordion */}
        {showInvestmentScore && (data.ai_investment_score || data.evaluation) && !isGeneratingEvaluation && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <>
              {/* Compact Header - Score and Rendite */}
              <button
                  onClick={() => setIsAIEvaluationExpanded(!isAIEvaluationExpanded)}
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-6">
                    {/* Score Badge */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        data.ai_investment_score >= 70 ? 'bg-green-50' :
                        data.ai_investment_score >= 40 ? 'bg-yellow-50' : 'bg-red-50'
                      }`}>
                        <Sparkles size={20} className={
                          data.ai_investment_score >= 70 ? 'text-green-600' :
                          data.ai_investment_score >= 40 ? 'text-yellow-600' : 'text-red-600'
                        } />
                      </div>
                      <div className="text-left">
                        <h3 className="text-base font-semibold text-gray-900">AI-Invest-Score</h3>
                        <InvestmentScoreBadge score={data.ai_investment_score} variant="compact" />
                      </div>
                    </div>

                    {/* Rendite */}
                    {data.yield_metrics?.brutto_rendite && (
                      <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                        <div className="text-left">
                          <p className="text-sm text-gray-500">Brutto-Rendite</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {data.yield_metrics.brutto_rendite.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Faktor */}
                    {data.yield_metrics?.faktor && (
                      <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                        <div className="text-left">
                          <p className="text-sm text-gray-500">Faktor</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {data.yield_metrics.faktor.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isAIEvaluationExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded Details - Full AIInvestmentEvaluation Component */}
                {isAIEvaluationExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Highlights and Red Flags - Accordion */}
                    {(data.highlights && data.highlights.length > 0 || data.red_flags && data.red_flags.length > 0) && (
                      <div className="border-b border-gray-200">
                        {/* Accordion Header */}
                        <button
                          onClick={() => setIsHighlightsExpanded(!isHighlightsExpanded)}
                          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <h3 className="text-base font-semibold text-gray-900">Highlights & Zu beachten</h3>
                              <p className="text-sm text-gray-500">
                                {data.highlights?.length || 0} Highlights, {data.red_flags?.length || 0} Warnsignale
                              </p>
                            </div>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isHighlightsExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Accordion Content */}
                        {isHighlightsExpanded && (
                          <div className="p-6 bg-white">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Highlights */}
                              {data.highlights && data.highlights.length > 0 && (
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Highlights</h3>
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
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Zu beachten</h3>
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
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mieteinnahmen Accordion */}
                    {(data.rental_income || data.actual_monthly_rent) && (() => {
                      const mainMonthlyRent = data.rental_income?.monthly_rent || data.actual_monthly_rent || 0;

                      return (
                        <div className="border-b border-gray-200">
                          <button
                            onClick={() => setIsRentalIncomeExpanded(!isRentalIncomeExpanded)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                                <Euro size={20} className="text-green-600" />
                              </div>
                              <div className="text-left">
                                <h3 className="text-base font-semibold text-gray-900">Mögliche Mieteinnahmen / Monat</h3>
                                <p className="text-2xl font-bold text-green-600">
                                  {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(mainMonthlyRent)}
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isRentalIncomeExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isRentalIncomeExpanded && (
                            <div className="px-6 pb-6 space-y-4 bg-white pt-4">
                              {data.actual_monthly_rent && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Kaltmiete (Ist)</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-lg font-semibold text-gray-900">
                                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.actual_monthly_rent)}/Monat
                                    </span>
                                    <span className="text-lg font-semibold text-gray-500">
                                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.actual_monthly_rent / data.sqm)}/m²
                                    </span>
                                  </div>
                                </div>
                              )}

                              {data.rental_income?.monthly_rent && (
                                <div className={`flex justify-between items-center ${data.actual_monthly_rent ? 'pt-4 border-t border-gray-200' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Marktmiete (AI-geschätzt 2025)</span>
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">KI</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="text-lg font-semibold text-gray-900">
                                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.rental_income.monthly_rent)}/Monat
                                    </span>
                                    {data.rental_income.rent_per_sqm && (
                                      <span className="text-lg font-semibold text-gray-900">
                                        {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.rental_income.rent_per_sqm)}/m²
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {data.rental_income?.annual_rent && (
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                  <span className="text-gray-600">Jahreskaltmiete (AI-Prognose)</span>
                                  <span className="text-lg font-semibold text-gray-900">
                                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.rental_income.annual_rent)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Cashflow Accordion */}
                    {(data.cashflow_calculation || data.actual_monthly_rent) && (() => {
                      const rentalIncome = data.cashflow_calculation?.rental_income || data.actual_monthly_rent || 0;
                      const hausgeld = data.cashflow_calculation?.non_transferable_fee || data.monthly_fee || 0;
                      const maintenance = data.cashflow_calculation?.maintenance_reserve || data.sqm * 1;
                      const loanPayment = data.cashflow_calculation?.loan_payment;
                      const loanDetails = data.cashflow_calculation?.loan_details;
                      const monthlyCashflow = data.cashflow_calculation?.monthly_cashflow !== undefined
                        ? data.cashflow_calculation.monthly_cashflow
                        : (loanPayment !== undefined ? rentalIncome - hausgeld - maintenance - loanPayment : undefined);

                      return (
                        <div className="border-b border-gray-200">
                          <button
                            onClick={() => setIsCashflowExpanded(!isCashflowExpanded)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 ${monthlyCashflow !== undefined && monthlyCashflow >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg flex items-center justify-center`}>
                                <ChartNoAxesCombined size={20} className={monthlyCashflow !== undefined && monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'} />
                              </div>
                              <div className="text-left">
                                <h3 className="text-base font-semibold text-gray-900">Monatlicher Cashflow</h3>
                                {monthlyCashflow !== undefined && (
                                  <p className={`text-2xl font-bold ${monthlyCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {(monthlyCashflow >= 0 ? '+' : '') + new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(monthlyCashflow)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCashflowExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {isCashflowExpanded && (
                            <div className="px-6 pb-6 space-y-4 bg-white pt-4">
                              {rentalIncome > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Mieteinnahmen</span>
                                  <span className="text-lg font-semibold text-[#00A699]">
                                    +{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rentalIncome)}
                                  </span>
                                </div>
                              )}

                              {hausgeld > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Hausgeld (nicht umlegbar)</span>
                                  <span className="text-lg font-semibold text-red-600">
                                    -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(hausgeld)}
                                  </span>
                                </div>
                              )}

                              {maintenance > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">Instandhaltungsrücklage</span>
                                  <span className="text-lg font-semibold text-red-600">
                                    -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(maintenance)}
                                  </span>
                                </div>
                              )}

                              {loanPayment !== undefined && loanPayment > 0 && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-600">
                                    Kreditrate{loanDetails ? ` ${loanDetails}` : ''}
                                  </span>
                                  <span className="text-lg font-semibold text-red-600">
                                    -{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(loanPayment)}
                                  </span>
                                </div>
                              )}

                              {monthlyCashflow !== undefined && (
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                  <span className="text-gray-900 font-bold">Monatlicher Cashflow</span>
                                  <span className={`text-xl font-bold ${monthlyCashflow >= 0 ? 'text-[#00A699]' : 'text-red-600'}`}>
                                    {(monthlyCashflow >= 0 ? '+' : '') + new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(monthlyCashflow)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <AIInvestmentEvaluation
                      evaluation={{
                        overall_score: data.ai_investment_score || 0,
                        color_rating: data.ai_investment_score >= 70 ? 'green' : data.ai_investment_score >= 40 ? 'yellow' : 'red',
                        location_score: data.evaluation?.location_score || 0,
                        price_score: data.evaluation?.price_score || 0,
                        yield_score: data.evaluation?.yield_score || 0,
                        appreciation_score: data.evaluation?.appreciation_score || 0,
                        features_score: data.evaluation?.features_score || 0,
                        price_per_sqm: data.evaluation?.price_per_sqm,
                        market_average_price_per_sqm: data.evaluation?.market_average_price_per_sqm,
                        estimated_monthly_rent: data.evaluation?.estimated_monthly_rent,
                        gross_yield_percentage: data.evaluation?.gross_yield_percentage,
                        rent_per_sqm: data.evaluation?.estimated_monthly_rent ? data.evaluation.estimated_monthly_rent / data.sqm : undefined,
                        interest_rate_90: data.evaluation?.interest_rate_90 ?? 3.9,
                        interest_rate_80: data.evaluation?.interest_rate_80,
                        // AI Analysis texts
                        location_analysis: data.evaluation?.location_analysis,
                        market_analysis: data.evaluation?.market_analysis,
                        rent_analysis: data.evaluation?.rent_analysis,
                        financing_analysis: data.evaluation?.financing_analysis,
                        // Yield metrics (Rendite-Kennzahlen)
                        brutto_rendite: data.yield_metrics?.brutto_rendite,
                        netto_rendite: data.yield_metrics?.netto_rendite,
                        ek_rendite: data.yield_metrics?.ek_rendite,
                        faktor: data.yield_metrics?.faktor,
                      }}
                      sqm={data.sqm}
                      variant="full"
                      showAnalysisText={true}
                      showMetrics={true}
                      showHeader={false}
                    />
                  </div>
                )}
            </>
          </div>
        )}

        {/* Anbieter Info */}
        {!hideProviderInfo && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Anbieter</h3>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {data.owner?.avatar_url ? (
                  <img
                    src={data.owner.avatar_url}
                    alt={`${data.owner.first_name || ''} ${data.owner.last_name || ''}`}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">
                      {data.owner?.first_name?.charAt(0)?.toUpperCase() || 'P'}
                    </span>
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900">
                    {data.owner?.first_name || data.owner?.last_name
                      ? `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim()
                      : 'Privater Anbieter'}
                  </h4>
                  {data.owner?.company ? (
                    <p className="text-sm text-gray-600">{data.owner.company}</p>
                  ) : (
                    <p className="text-sm text-gray-500">-</p>
                  )}
                </div>
              </div>

              {/* Chat Button */}
              {onContactAgent && (
                <button
                  onClick={onContactAgent}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 transition-colors font-medium"
                >
                  <MessageCircle size={20} />
                  <span>Anbieter chatten</span>
                </button>
              )}
            </div>
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
