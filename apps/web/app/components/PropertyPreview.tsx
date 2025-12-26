'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Bath, Sparkles, DoorClosed, Square, Layers, Euro, Building2, Clock, Flame, Zap, ChevronDown, Star, Eye, Heart, Mail, FileText, Loader2, Landmark } from 'lucide-react';
import { LocationDisplay } from './LocationDisplay';
import { MarketComparisonBar } from './MarketComparisonBar';

// Dynamic imports for heavy components - reduces initial bundle size
// AIEvaluationPanel removed - market comparison now provides all data

const KeyMetricsPanel = dynamic(() => import('./KeyMetricsPanel').then(mod => ({ default: mod.KeyMetricsPanel })), {
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>,
  ssr: false,
});

const BuyVsRentCard = dynamic(() => import('./BuyVsRentCard').then(mod => ({ default: mod.BuyVsRentCard })), {
  loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin text-gray-400" size={24} /></div>,
  ssr: false,
});

// AIInvestmentEvaluation und InvestmentScoreBadge auskommentiert - nur stichpunktartige Bewertung
// import { AIInvestmentEvaluation, InvestmentScoreBadge } from '@immoflow/ui';

import type { PropertyDocument } from '../create-listing/types';
import { PropertyDocumentsList } from './PropertyDocumentsList';
import { DocumentVisibilityManager } from './DocumentVisibilityManager';
import { SellerKnowledgeManager } from './SellerKnowledgeManager';
import { trpc } from '@/app/providers/TRPCProvider';

export interface PropertyPreviewData {
  id?: string;
  images: string[];
  video_url?: string | null;
  documents?: PropertyDocument[];
  documents_count?: number;
  price: number;
  commission_rate?: number;
  location: string;
  address?: string;
  postal_code?: number | string;
  title: string;
  type?: string;
  sqm: number;
  rooms: number;
  plot_size?: number; // Grundstückfläche (for houses)
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
  elevator?: boolean;
  available_from?: string;
  year_built?: number;
  heating_type?: string;
  energy_source?: string;
  energy_certificate?: string;
  energy_efficiency_class?: string;
  condition?: string;
  important_notes?: string;
  days_online?: number;
  // Aggregated feedback stats
  total_views?: number;
  favorites_count?: number;
  rating_count?: number;
  avg_rating?: number;
  avg_suggested_price?: number;
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
  financing_terms?: {
    interest_rate?: number;
    interest_rate_90?: number;
    interest_rate_80?: number;
    loan_to_value?: number;
    amortization_rate?: number;
    loan_term_years?: number;
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
  // AI Rating fields (legacy)
  ai_rating_explanation?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  risks?: string[];
  // New evaluation types
  seller_evaluation?: {
    viewType: 'seller';
    marketValueMin: number;
    marketValueMax: number;
    recommendedPrice: number;
    comparableSales: number;
    marketingDurationMin: number;
    marketingDurationMax: number;
    priceAssessment: string;
    summary: string;
    sellingPoints: string[];
    improvementSuggestions: string[];
  };
  buyer_evaluation?: {
    buyer_selfuse?: {
      viewType: 'buyer_selfuse';
      livingScore: number;
      locationQuality: string;
      locationDescription: string;
      shoppingFacilities: string;
      shoppingDistance: string;
      buyVsRentYears: number;
      buyVsRentAssessment: string;
      noiseLevel: string;
      noiseDescription: string;
      summary: string;
      pros: string[];
      cons: string[];
    };
    buyer_investor?: {
      viewType: 'buyer_investor';
      investmentScore: number;
      grossYield: number;
      netYield: number;
      monthlyBudget: number;
      rentMultiplier: number;
      microLocation: string;
      microLocationTrend: string;
      riskLevel: string;
      riskFactors: string[];
      summary: string;
      strengths: string[];
      weaknesses: string[];
    };
  };
  owner?: {
    first_name?: string;
    last_name?: string;
    company?: string | null;
    avatar_url?: string | null;
    user_type?: string;
    phone?: string | null;
    email?: string | null;
    bio?: string | null;
  };
  // AfA type for tax calculations
  afa_type?: 'bestand' | 'altbau' | 'neubau' | 'denkmal';
  // Additional metadata fields
  property_type?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  owner_profile?: {
    first_name?: string;
    last_name?: string;
    company?: string | null;
    avatar_url?: string | null;
    user_type?: string;
    phone?: string | null;
    email?: string | null;
    bio?: string | null;
  };
}

export interface PropertyPreviewProps {
  data: PropertyPreviewData;
  className?: string;
  showActions?: boolean;
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
  onTriggerEvaluation?: (viewType?: 'seller' | 'buyer_selfuse' | 'buyer_investor') => void;
  showEvaluationButton?: boolean;
  // Evaluation view type - determines which KI evaluation to show
  evaluationViewType?: 'seller' | 'buyer';  // 'seller' for create-listing, 'buyer' for property detail
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
  // Document selection callback
  onDocumentSelect?: (document: PropertyDocument | null) => void;
  // Document access control
  hasDocumentAccess?: boolean;
  hasManualApproval?: boolean;
  onDocumentAccessGranted?: () => void;
  onRequestDocumentAccess?: () => void;
  // Manual document approval (for owner)
  pendingManualApprovalCount?: number;
  onApproveManualDocs?: () => void;
  // Document management (for create-listing)
  onDocumentsChange?: (documents: PropertyDocument[]) => void;
  onDocumentRemove?: (id: string) => void;
  // User Property Parameters (for KeyMetricsPanel edit mode)
  userPropertyParams?: {
    equity_percentage?: number | null;
    interest_rate?: number | null;
    amortization_rate?: number | null;
    broker_commission?: number | null;
    monthly_rent?: number | null;
    monthly_fee?: number | null;
    renovation_costs?: number | null;
    purchase_price?: number | null;
  } | null;
  onSaveUserPropertyParams?: (params: {
    equityPercentage?: number | null;
    interestRate?: number | null;
    amortizationRate?: number | null;
    brokerCommission?: number | null;
    monthlyRent?: number | null;
    monthlyFee?: number | null;
    renovationCosts?: number | null;
    purchasePrice?: number | null;
  }) => void;
  isSavingUserPropertyParams?: boolean;
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
  showAddress = true,
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
  evaluationViewType = 'seller',
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
  onDocumentSelect,
  hasDocumentAccess = false,
  hasManualApproval = false,
  onDocumentAccessGranted,
  onRequestDocumentAccess,
  pendingManualApprovalCount = 0,
  onApproveManualDocs,
  onDocumentsChange,
  onDocumentRemove,
  userPropertyParams,
  onSaveUserPropertyParams,
  isSavingUserPropertyParams = false,
}: PropertyPreviewProps) {
  // State for selected document
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | undefined>();

  // Handle document click - memoized to prevent re-renders
  const handleDocumentClick = useCallback((document: PropertyDocument) => {
    setSelectedDocumentId(document.id);
    onDocumentSelect?.(document);
  }, [onDocumentSelect]);

  // State for rental income accordion
  const [isRentalIncomeExpanded, setIsRentalIncomeExpanded] = useState(false);
  // State for cashflow accordion
  const [isCashflowExpanded, setIsCashflowExpanded] = useState(false);
  // State for weitere details accordion - expanded by default when data exists
  const [isWeitereDetailsExpanded, setIsWeitereDetailsExpanded] = useState(false);
  // State for description accordion - initially collapsed
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // State for AI evaluation accordion
  const [isAIEvaluationExpanded, setIsAIEvaluationExpanded] = useState(false);
  // State for highlights and red flags accordion
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false);
  // State for market comparison accordion
  const [isMarketComparisonExpanded, setIsMarketComparisonExpanded] = useState(false);
  // State for price optimization suggestion
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);
  // State for simulated price (when user drags the slider)
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);
  // buyerTabSelected state entfernt - beide Scores werden jetzt untereinander angezeigt

  // Fetch market data for comparison (without needing full AI analysis)
  const { data: marketData, isLoading: isLoadingMarketData } = trpc.properties.getMarketComparison.useQuery(
    {
      propertyId: propertyId,
      price: Number(data.price),
      sqm: Number(data.sqm),
      location: data.location,
      propertyType: data.property_type as 'apartment' | 'house' | 'villa' | 'commercial' | 'land' | 'office' | 'retail' | 'industrial' | 'parking' | 'multi_family' | undefined,
    },
    {
      enabled: Number(data.price) > 0 && Number(data.sqm) > 0 && !!data.location,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
    }
  );

  // Memoized price formatter to avoid recreation on every render
  const formatPrice = useCallback((price: number) => {
    if (!price || price === 0) return '€ 0';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // Memoized price per sqm calculation
  const pricePerSqm = useMemo(() =>
    data.sqm > 0 ? Math.round(data.price / data.sqm) : 0
  , [data.sqm, data.price]);

  // Helper to get German property type label
  const getPropertyTypeLabel = (type?: string): string => {
    switch (type) {
      case 'apartment':
        return 'Wohnung';
      case 'house':
        return 'Haus';
      case 'land':
        return 'Grundstück';
      case 'commercial':
        return 'Gewerbe';
      default:
        return 'Immobilie';
    }
  };

  // Generate dynamic property title from data
  const getPropertyTitle = (): string => {
    // If user/AI provided a title, use it (unless it's the default placeholder)
    if (data.title && data.title !== 'Deine Immobilie') {
      return data.title;
    }

    // Otherwise, generate dynamic title from property data
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

  // Format floor/total floors (different for apartments vs houses)
  const floorDisplay = (() => {
    const elevatorSuffix = data.elevator ? ' mit Aufzug' : '';

    // For houses: only show total floors (e.g., "2-geschossig")
    if (data.type === 'house' && data.total_floors) {
      return `${data.total_floors}-geschossig`;
    }
    // For apartments: show floor_level / total_floors (e.g., "2. OG mit Aufzug")
    if (data.type === 'apartment') {
      if (data.floor_level && data.total_floors) {
        return `${data.floor_level} / ${data.total_floors}${elevatorSuffix}`;
      }
      if (data.floor_level) {
        return `${data.floor_level}${elevatorSuffix}`;
      }
      return '-';
    }
    // For other types (land, commercial)
    return '-';
  })();

  // Label for floor display
  const floorLabel = data.type === 'house' ? 'Anzahl Geschoße' : 'Geschoss';

  return (
    <div className={`${className} relative`}>
      {/* Sticky Badges - Top Right */}
      {(statusBadge || data.total_views !== undefined || data.favorites_count !== undefined || data.avg_rating !== undefined) ? (
        <div className="sticky top-4 z-10 flex flex-wrap justify-end gap-2 mb-4">
          {/* Views Badge */}
          {data.total_views !== undefined && data.total_views > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
              <Eye size={16} />
              {data.total_views}
            </span>
          )}

          {/* Favorites Badge */}
          {data.favorites_count !== undefined && data.favorites_count > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-pink-100 text-pink-700">
              <Heart size={16} />
              {data.favorites_count}
            </span>
          )}

          {/* Rating Badge */}
          {data.avg_rating !== undefined && data.rating_count !== undefined && data.rating_count > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              <Star size={16} fill="currentColor" />
              {Number(data.avg_rating).toFixed(1)}
              <span className="text-yellow-600">({data.rating_count})</span>
            </span>
          )}

          {/* Average Suggested Price Badge */}
          {data.avg_suggested_price !== undefined && data.avg_suggested_price > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <Euro size={16} />
              Ø {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(data.avg_suggested_price)}
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
        {/* Property Title and Type Badge */}
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            {/* Property Type Badge - Glass Style Rose */}
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-rose-100/60 text-rose-700 backdrop-blur-sm border border-rose-200 shadow-sm">
              {getPropertyTypeLabel(data.type)}
            </span>
            {/* Right side: Days Online Badge */}
            <div className="flex items-center gap-2">
              {/* Days Online Badge */}
              {data.days_online !== undefined && (
                <span className="inline-flex items-center justify-center h-10 px-3 rounded-full text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
                  {data.days_online === 0 ? 'Neu' : `+${data.days_online}T`}
                </span>
              )}
            </div>
          </div>
          <h2 className="font-semibold text-gray-900" style={{ fontSize: '22px' }}>
            {getPropertyTitle()}
          </h2>
        </div>

        {/* Location - Full Address (Straße, PLZ Ort) or just Location */}
        <div className="mb-6">
          <LocationDisplay
            location={data.location}
            address={data.address}
            postalCode={data.postal_code}
            showAddress={shouldShowAddress}
            onRequestAddress={onRequestAddress}
            linkToMaps={true}
            isOwner={isOwner}
          />
        </div>

        {/* Price Card - Premium Gradient */}
        <div className="mb-6 p-6 bg-white rounded-2xl border border-gray-200">
          {/* Price and Price per sqm - Responsive Layout */}
          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
            {/* Left: Kaufpreis */}
            <div>
              <p className="text-sm text-gray-500 mb-2">Kaufpreis</p>
              <h1 className="font-bold text-gray-900" style={{ fontSize: '40px', lineHeight: '1' }}>
                {data.price > 0 ? formatPrice(data.price) : '-'}
              </h1>
            </div>

            {/* Right: Preis pro m² */}
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Preis pro m²</p>
              {(() => {
                // Determine color based on view type and market comparison
                let priceColor = 'text-gray-900'; // Default

                if (evaluationViewType === 'buyer') {
                  const marketAvgPrice = marketData?.marketAvgPricePerSqm || sellerAnalysisMarketAverage || data.evaluation?.market_average_price_per_sqm;
                  if (marketAvgPrice && pricePerSqm > 0) {
                    const difference = ((pricePerSqm - marketAvgPrice) / marketAvgPrice) * 100;
                    if (difference < -3) {
                      priceColor = 'text-green-600'; // Under market = good for buyer
                    } else if (difference > 3) {
                      priceColor = 'text-red-600'; // Over market = bad for buyer
                    }
                  }
                }

                return (
                  <h2 className={`font-bold ${priceColor}`} style={{ fontSize: '28px', lineHeight: '1' }}>
                    {pricePerSqm > 0 ? formatPrice(pricePerSqm) : '-'}
                  </h2>
                );
              })()}
            </div>
          </div>

          {/* Commission */}
          <p className={`text-base mt-3 ${
            data.commission_rate != null && data.commission_rate > 0
              ? 'text-gray-600'
              : 'text-green-600 font-medium'
          }`}>
            {data.commission_rate != null && data.commission_rate > 0
              ? `Provision: ${data.commission_rate.toFixed(2).replace('.', ',')} % inkl. MwSt.`
              : '✓ Provisionsfrei'}
          </p>

        </div>

        {/* Market Comparison Card - Show when price is entered */}
        {data.price > 0 && data.sqm > 0 && data.location && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Header - Always Visible */}
            <div
              className="p-6 flex items-center justify-between cursor-pointer"
              onClick={() => setIsMarketComparisonExpanded(!isMarketComparisonExpanded)}
            >
              <div className="flex items-center gap-3">
                {/* AI Score Badge */}
                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border-2 ${
                  data.ai_investment_score !== undefined && data.ai_investment_score >= 70
                    ? 'bg-green-50 border-green-300'
                    : data.ai_investment_score !== undefined && data.ai_investment_score >= 50
                      ? 'bg-yellow-50 border-yellow-300'
                      : data.ai_investment_score !== undefined && data.ai_investment_score > 0
                        ? 'bg-red-50 border-red-300'
                        : 'bg-gray-50 border-gray-300'
                }`}>
                  <span className={`text-xl font-bold ${
                    data.ai_investment_score !== undefined && data.ai_investment_score >= 70
                      ? 'text-green-600'
                      : data.ai_investment_score !== undefined && data.ai_investment_score >= 50
                        ? 'text-yellow-600'
                        : data.ai_investment_score !== undefined
                          ? 'text-red-600'
                          : 'text-gray-400'
                  }`}>
                    {data.ai_investment_score !== undefined ? Math.round(data.ai_investment_score) : '—'}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Smart-Check</h3>
                  </div>
                  {(() => {
                    const marketAvgPrice = marketData?.marketAvgPricePerSqm || sellerAnalysisMarketAverage || data.evaluation?.market_average_price_per_sqm || 3500;
                    const difference = ((pricePerSqm - marketAvgPrice) / marketAvgPrice) * 100;
                    const percentDiff = Math.abs(Math.round(difference));

                    if (percentDiff <= 3) {
                      return <p className="text-sm text-blue-600 font-medium">Marktgerecht</p>;
                    } else if (difference < 0) {
                      return <p className="text-sm text-green-600 font-medium">{percentDiff}% unter Marktdurchschnitt</p>;
                    } else {
                      return <p className="text-sm text-orange-600 font-medium">{percentDiff}% über Marktdurchschnitt</p>;
                    }
                  })()}
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isMarketComparisonExpanded ? 'rotate-180' : ''}`}
              />
            </div>

            {/* Expanded Content */}
            {isMarketComparisonExpanded && (
              <div className="px-6 pb-6 border-t border-gray-200 pt-4">
                {(() => {
                  const marketAvgPrice = marketData?.marketAvgPricePerSqm || sellerAnalysisMarketAverage || data.evaluation?.market_average_price_per_sqm || 3500;
                  const difference = ((pricePerSqm - marketAvgPrice) / marketAvgPrice) * 100;
                  const deviationPercent = Math.round(difference);

                  let pricePosition: 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer';
                  if (deviationPercent <= -15) {
                    pricePosition = 'sehr_guenstig';
                  } else if (deviationPercent <= -5) {
                    pricePosition = 'guenstig';
                  } else if (deviationPercent <= 5) {
                    pricePosition = 'marktgerecht';
                  } else if (deviationPercent <= 15) {
                    pricePosition = 'teuer';
                  } else {
                    pricePosition = 'sehr_teuer';
                  }

                  // Determine viewType for MarketComparisonBar
                  const marketViewType = evaluationViewType === 'seller'
                    ? 'seller'
                    : (data.buyer_evaluation?.buyer_selfuse ? 'buyer_selfuse' : 'buyer_investor');

                  // Get monthly rent for Eigennutzer buy vs rent calculation
                  const estimatedMonthlyRent = data.rental_income?.estimated_market_rent
                    || data.evaluation?.estimated_monthly_rent
                    || data.actual_monthly_rent;

                  return (
                    <>
                      <MarketComparisonBar
                        deviationPercent={deviationPercent}
                        pricePosition={pricePosition}
                        currentPricePerSqm={simulatedPrice ? Math.round(simulatedPrice / data.sqm) : pricePerSqm}
                        currentTotalPrice={simulatedPrice || undefined}
                        marketAvgPricePerSqm={marketAvgPrice}
                        sqm={data.sqm}
                        rooms={data.rooms}
                        location={data.location}
                        isInteractive={true}
                        viewType={evaluationViewType === 'seller' ? 'seller' : 'buyer_selfuse'}
                        onPriceChange={(newPrice) => setSimulatedPrice(newPrice)}
                        // API data for market comparison
                        marketingDurationMin={marketData?.marketingDurationMin}
                        marketingDurationMax={marketData?.marketingDurationMax}
                        aiScore={marketData?.aiScore}
                      />

                      {/* Price Suggestion for Sellers */}
                      {evaluationViewType === 'seller' && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          {!showPriceSuggestion ? (
                            <div className="flex justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowPriceSuggestion(true);
                                }}
                                className="py-3 px-6 bg-gradient-to-r from-[#FF385C] to-[#E31C5F] hover:from-[#E31C5F] hover:to-[#C81E4E] text-white rounded-full transition-all flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-[#FF385C]/30 hover:shadow-xl hover:shadow-[#FF385C]/40 hover:-translate-y-0.5"
                              >
                                <Sparkles size={16} />
                                KI-Preisoptimierung
                              </button>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Sparkles size={16} className="text-purple-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 mb-2">Preisempfehlung der KI</p>
                                  {(() => {
                                    const suggestedPrice = Math.round(marketAvgPrice * data.sqm);
                                    const suggestedMin = Math.round(suggestedPrice * 0.95);
                                    const suggestedMax = Math.round(suggestedPrice * 1.05);

                                    return (
                                      <>
                                        <p className="text-2xl font-bold text-gray-900 mb-1">
                                          {formatPrice(suggestedPrice)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          Optimale Preisspanne: {formatPrice(suggestedMin)} – {formatPrice(suggestedMax)}
                                        </p>
                                        {deviationPercent > 10 && (
                                          <p className="text-xs text-orange-600 mt-2">
                                            Tipp: Eine Preisanpassung könnte die Vermarktungszeit verkürzen.
                                          </p>
                                        )}
                                        {deviationPercent < -10 && (
                                          <p className="text-xs text-green-600 mt-2">
                                            Tipp: Sie könnten den Preis erhöhen und sind immer noch unter Markt.
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Deal-Insights - nur für Buyer View */}
        {evaluationViewType === 'buyer' && (
          <KeyMetricsPanel
            aiScore={data.ai_investment_score}
            grossYield={data.buyer_evaluation?.buyer_investor?.grossYield}
            rentMultiplier={data.buyer_evaluation?.buyer_investor?.rentMultiplier}
            purchasePrice={simulatedPrice || userPropertyParams?.purchase_price || data.price}
            commissionRate={data.commission_rate}
            location={data.location}
            financingTerms={data.financing_terms ? {
              interestRate: data.financing_terms.interest_rate_90 ?? data.financing_terms.interest_rate,
              amortizationRate: data.financing_terms.amortization_rate,
              loanToValue: data.financing_terms.loan_to_value,
            } : undefined}
            sqm={data.sqm}
            estimatedRentPerSqm={data.rental_income?.rent_per_sqm}
            monthlyFee={data.monthly_fee}
            yearBuilt={data.year_built}
            estimatedRent={data.rental_income?.estimated_market_rent || data.evaluation?.estimated_monthly_rent || data.actual_monthly_rent}
            estimatedOperatingCosts={data.cashflow_calculation?.non_transferable_fee}
            onTriggerEvaluation={onTriggerEvaluation ? () => onTriggerEvaluation('buyer_investor') : undefined}
            isLoading={isGeneratingEvaluation}
            propertyId={propertyId}
            userParams={userPropertyParams}
            onSaveParams={onSaveUserPropertyParams}
            isSavingParams={isSavingUserPropertyParams}
            onPurchasePriceChange={setSimulatedPrice}
            className="mb-6"
          />
        )}

        {/* Kaufen vs. Mieten Card - für Eigennutzer */}
        {evaluationViewType === 'buyer' && (
          <BuyVsRentCard
            purchasePrice={simulatedPrice || userPropertyParams?.purchase_price || data.price}
            sqm={data.sqm}
            location={data.location}
            monthlyRent={data.rental_income?.estimated_market_rent || data.evaluation?.estimated_monthly_rent || data.actual_monthly_rent}
            avgRentPerSqm={data.rental_income?.rent_per_sqm}
            monthlyFee={data.monthly_fee}
            yearBuilt={data.year_built}
            interestRate={data.financing_terms?.interest_rate_90 ?? data.financing_terms?.interest_rate ?? 3.5}
            amortizationRate={data.financing_terms?.amortization_rate ?? 2.0}
            equityPercentage={(userPropertyParams?.equity_percentage != null && userPropertyParams.equity_percentage > 0) ? userPropertyParams.equity_percentage : 20}
            commissionRate={data.commission_rate}
            propertyId={propertyId}
            userParams={userPropertyParams}
            onSaveParams={onSaveUserPropertyParams}
            isSavingParams={isSavingUserPropertyParams}
            onPurchasePriceChange={setSimulatedPrice}
            className="mb-6"
          />
        )}

        {/* Weitere Details Section - Compact Accordion */}
        {(data.sqm || data.rooms || energyEfficiencyClass || data.available_from || data.year_built || data.afa_type || data.bathrooms || data.monthly_fee || data.floor_level || data.total_floors || data.heating_type || data.energy_source || data.energy_certificate || data.usable_area || condition) && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {/* Always Visible - Icons and Values Only */}
            <div
              className="p-6 flex items-center justify-between gap-4 cursor-pointer"
              onClick={() => setIsWeitereDetailsExpanded(!isWeitereDetailsExpanded)}
            >
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

                {/* Year Built & Energy Efficiency Class - Combined */}
                {(data.year_built || energyEfficiencyClass) && (
                  <div className="flex items-center gap-2">
                    <Building2 size={20} className="text-gray-600" />
                    <span className="text-base font-semibold text-gray-900">
                      {data.year_built && `Bj. ${data.year_built}`}
                      {data.year_built && energyEfficiencyClass && ' • '}
                      {energyEfficiencyClass && `Energie ${energyEfficiencyClass}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Expand/Collapse Icon */}
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${isWeitereDetailsExpanded ? 'rotate-180' : ''}`}
              />
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

                  {/* Plot Size (Grundstückfläche) - Only for houses */}
                  {data.type === 'house' && data.plot_size && data.plot_size > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <Layers size={20} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Grundstückfläche</p>
                        <p className="text-base font-semibold text-gray-900">{data.plot_size} m²</p>
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

                  {/* AfA Type - Depreciation Category */}
                  {data.afa_type && (
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        data.afa_type === 'denkmal' ? 'bg-amber-50' :
                        data.afa_type === 'neubau' ? 'bg-green-50' :
                        data.afa_type === 'altbau' ? 'bg-purple-50' : 'bg-gray-50'
                      }`}>
                        <Landmark size={20} className={
                          data.afa_type === 'denkmal' ? 'text-amber-600' :
                          data.afa_type === 'neubau' ? 'text-green-600' :
                          data.afa_type === 'altbau' ? 'text-purple-600' : 'text-gray-600'
                        } />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">AfA-Typ</p>
                        <p className="text-base font-semibold text-gray-900">
                          {data.afa_type === 'denkmal' ? 'Denkmal (9%)' :
                           data.afa_type === 'neubau' ? 'Neubau (5% degr.)' :
                           data.afa_type === 'altbau' ? 'Altbau (2,5%)' : 'Bestand (2%)'}
                        </p>
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
                        <p className="text-sm text-gray-500">{floorLabel}</p>
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

        {/* Description - No header, just content */}
        {data.description && (() => {
          const maxPreviewLength = 150;
          const isLongDescription = data.description.length > maxPreviewLength;
          const previewText = isLongDescription
            ? data.description.slice(0, maxPreviewLength) + '...'
            : data.description;

          return (
            <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden p-6">
              {/* Important Notes - Show if exists */}
              {data.important_notes && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <p className="text-base text-gray-700 leading-relaxed">
                    {data.important_notes}
                  </p>
                </div>
              )}

              {/* Description Text - whitespace-pre-line preserves newlines for structured content */}
              <p className="text-gray-700 leading-relaxed text-base whitespace-pre-line">
                {isDescriptionExpanded || !isLongDescription ? data.description : previewText}
              </p>

              {/* Show more/less button */}
              {isLongDescription && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-3 text-sm font-medium text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  {isDescriptionExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                  />
                </button>
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

        {/* KI-Wissensbasis - Only for property owner */}
        {isOwner && propertyId && (
          <div className="mb-6">
            <SellerKnowledgeManager propertyId={propertyId} />
          </div>
        )}

        {/* Objektunterlagen - Documents Management */}
        {(() => {
          const hasDocuments = data.documents && data.documents.length > 0;
          const showVisibilityManager = onDocumentsChange && hasDocuments;
          const showEmptyState = onDocumentsChange && !hasDocuments;

          return (
            <>
              {/* Document Visibility Manager - Show in create-listing for owner to manage visibility */}
              {showVisibilityManager && (
                <DocumentVisibilityManager
                  documents={data.documents || []}
                  onDocumentsChange={onDocumentsChange}
                  onDocumentRemove={onDocumentRemove}
                  onDocumentClick={handleDocumentClick}
                />
              )}

              {/* Empty State - Show in edit mode when no documents */}
              {showEmptyState && (
                <div className="mb-6 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={20} className="text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Objektunterlagen</h3>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6 text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                        <FileText size={24} className="text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">Noch keine Unterlagen hochgeladen</p>
                      <p className="text-sm text-gray-500">
                        Lade PDFs, Grundrisse oder Energieausweise über das Chat-Feld hoch.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Document List - Show for viewers (non-owners) or when no visibility manager */}
              {/* Access request form is now integrated inside PropertyDocumentsList */}
              {!showVisibilityManager && !showEmptyState && (
                <PropertyDocumentsList
                  key={propertyId}
                  documents={data.documents}
                  propertyId={propertyId}
                  documentsCount={data.documents_count ?? data.documents?.length}
                  onDocumentClick={handleDocumentClick}
                  selectedDocumentId={selectedDocumentId}
                  hasDocumentAccess={hasDocumentAccess}
                  hasManualApproval={hasManualApproval}
                  isOwner={isOwner}
                  onAccessGranted={onDocumentAccessGranted}
                  onRequestDocumentAccess={onRequestDocumentAccess}
                  pendingManualApprovalCount={pendingManualApprovalCount}
                  onApproveManualDocs={onApproveManualDocs}
                />
              )}
            </>
          );
        })()}

        {/* Anbieter Info - Only show when owner data exists */}
        {!hideProviderInfo && data.owner && (
          <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                {data.owner?.avatar_url ? (
                  <img
                    src={data.owner.avatar_url}
                    alt={`${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim() || 'Anbieter'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 text-lg font-semibold">
                    {(data.owner?.first_name?.[0] || data.owner?.last_name?.[0] || 'A').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name, Bio und E-Mail */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900">
                  {data.owner?.first_name || data.owner?.last_name
                    ? `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim()
                    : 'Privater Anbieter'}
                </p>
                {data.owner?.bio && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {data.owner.bio}
                  </p>
                )}
                {(data.owner?.email || data.owner_profile?.email) && (
                  <a
                    href={`mailto:${data.owner?.email || data.owner_profile?.email}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary transition-colors mt-1"
                  >
                    <Mail size={14} />
                    <span>{data.owner?.email || data.owner_profile?.email}</span>
                  </a>
                )}
              </div>
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
