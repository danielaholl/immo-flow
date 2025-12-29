'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Bath, Sparkles, DoorClosed, Square, Layers, Euro, Building2, Clock, Flame, Zap, ChevronDown, ChevronRight, Star, Eye, Heart, Mail, FileText, Loader2, Landmark, TrendingDown, TrendingUp, Equal, Info, ArrowUpDown, Calendar, Wallet, FileCheck, TreePine, Calculator } from 'lucide-react';
import { PropertyScoreBadge } from '@rendito/ui';
import { LocationDisplay } from './LocationDisplay';
import { MarketComparisonBar } from './MarketComparisonBar';


// AIInvestmentEvaluation und InvestmentScoreBadge auskommentiert - nur stichpunktartige Bewertung
// import { AIInvestmentEvaluation, InvestmentScoreBadge } from '@rendito/ui';

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

  // Handle document click - memoized to prevent re-renders, supports toggle (null to close)
  const handleDocumentClick = useCallback((document: PropertyDocument | null) => {
    setSelectedDocumentId(document?.id);
    onDocumentSelect?.(document);
  }, [onDocumentSelect]);

  // State for rental income accordion
  const [isRentalIncomeExpanded, setIsRentalIncomeExpanded] = useState(false);
  // State for cashflow accordion
  const [isCashflowExpanded, setIsCashflowExpanded] = useState(false);
  // State for description accordion - initially collapsed
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  // State for AI evaluation accordion
  const [isAIEvaluationExpanded, setIsAIEvaluationExpanded] = useState(false);
  // State for highlights and red flags accordion
  const [isHighlightsExpanded, setIsHighlightsExpanded] = useState(false);
  // State for market comparison accordion
  const [isMarketComparisonExpanded, setIsMarketComparisonExpanded] = useState(false);
  // State for all details panel (shown when clicking the details card)
  const [isAllDetailsExpanded, setIsAllDetailsExpanded] = useState(false);
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
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <Eye size={16} />
              {data.total_views}
            </span>
          )}

          {/* Favorites Badge */}
          {data.favorites_count !== undefined && data.favorites_count > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300">
              <Heart size={16} />
              {data.favorites_count}
            </span>
          )}

          {/* Rating Badge */}
          {data.avg_rating !== undefined && data.rating_count !== undefined && data.rating_count > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
              <Star size={16} fill="currentColor" />
              {Number(data.avg_rating).toFixed(1)}
              <span className="text-yellow-600 dark:text-yellow-400">({data.rating_count})</span>
            </span>
          )}

          {/* Average Suggested Price Badge */}
          {data.avg_suggested_price !== undefined && data.avg_suggested_price > 0 && (
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
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
        {/* Price Card - Premium Gradient */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
          {/* Property Type, Title, Location */}
          <div className="mb-4">
            <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-rose-100/60 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 backdrop-blur-sm border border-rose-200 dark:border-rose-800 shadow-sm mb-2">
              {getPropertyTypeLabel(data.type)}
            </span>
            <h2 className="font-semibold text-gray-900 dark:text-white text-lg leading-tight mb-2">{data.title}</h2>
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

          {/* Price and Price per sqm - Responsive Layout */}
          <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            {/* Left: Kaufpreis */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Kaufpreis</p>
              <h1 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '40px', lineHeight: '1' }}>
                {data.price > 0 ? formatPrice(data.price) : '-'}
              </h1>
            </div>

            {/* Right: Preis pro m² */}
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Preis pro m²</p>
              <h2 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '28px', lineHeight: '1' }}>
                {pricePerSqm > 0 ? formatPrice(pricePerSqm) : '-'}
              </h2>
            </div>
          </div>

          {/* Commission */}
          <p className={`text-base mt-1 ${
            data.commission_rate != null && data.commission_rate > 0
              ? 'text-gray-600'
              : 'text-green-600 font-medium'
          }`}>
            {data.commission_rate != null && data.commission_rate > 0
              ? `Provision: ${data.commission_rate.toFixed(2).replace('.', ',')} % inkl. MwSt.`
              : '✓ Provisionsfrei'}
          </p>

        </div>

        {/* Property Details Cards - Wohnfläche, Zimmer, Baujahr, Details */}
        {(() => {
          // Berechne Details-Count vorab für Grid-Layout (inkl. Energie und Geschoss)
          const detailsCount = [
            energyEfficiencyClass,
            data.floor_level || data.total_floors,
            data.bathrooms && data.bathrooms > 0,
            conditionLabel,
            typeof data.elevator === 'boolean',
            data.heating_type,
            data.energy_source,
            data.energy_certificate,
            data.monthly_fee && data.monthly_fee > 0,
            data.available_from,
            data.afa_type,
            data.type === 'house' && data.plot_size && data.plot_size > 0,
            data.usable_area && data.usable_area > 0,
          ].filter(Boolean).length;

          return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {/* Wohnfläche */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1.5">
              <Square size={24} className="text-blue-500" />
              Wohnfläche
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.sqm ? `${Math.ceil(data.sqm)} m²` : '–'}
            </p>
          </div>

          {/* Zimmer */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1.5">
              <DoorClosed size={24} className="text-violet-500" />
              Zimmer
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.rooms
                ? (data.rooms % 1 === 0
                    ? Math.floor(data.rooms)
                    : data.rooms.toFixed(1).replace('.', ','))
                : '–'}
            </p>
          </div>

          {/* Baujahr */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1.5">
              <Building2 size={24} className="text-amber-500" />
              Baujahr
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {data.year_built ? data.year_built : '–'}
            </p>
          </div>

          {/* Alle Details - Clickable Card */}
          <div
            onClick={() => setIsAllDetailsExpanded(!isAllDetailsExpanded)}
            className={`bg-white dark:bg-gray-900 rounded-xl border p-3 text-center cursor-pointer transition-all duration-200 ${
              isAllDetailsExpanded
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/50'
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1.5">
              <Info size={24} className="text-indigo-500" />
              Details
            </p>
            <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
              +{detailsCount}
            </p>
          </div>
        </div>
          );
        })()}

        {/* All Details Panel - Expandable */}
        {isAllDetailsExpanded && (
          <div className="mb-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Energieeffizienzklasse */}
              {energyEfficiencyClass && (
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-green-500" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">Energieeffizienz {energyEfficiencyClass}</span>
                </div>
              )}

              {/* Geschoss */}
              {(data.floor_level || data.total_floors) && (
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-purple-500" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {data.floor_level && data.total_floors
                      ? `${data.floor_level}/${data.total_floors} Geschoss`
                      : data.floor_level
                        ? `${data.floor_level}`
                        : `${data.total_floors} Geschosse`}
                  </span>
                </div>
              )}

              {/* Badezimmer */}
              {data.bathrooms && data.bathrooms > 0 && (
                <div className="flex items-center gap-2">
                  <Bath size={20} className="text-cyan-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{data.bathrooms} Badezimmer</span>
                </div>
              )}

              {/* Zustand */}
              {conditionLabel && (
                <div className="flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{conditionLabel}</span>
                </div>
              )}

              {/* Aufzug */}
              {typeof data.elevator === 'boolean' && (
                <div className="flex items-center gap-2">
                  <ArrowUpDown size={20} className="text-green-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{data.elevator ? 'Mit Aufzug' : 'Ohne Aufzug'}</span>
                </div>
              )}

              {/* Heizungsart */}
              {data.heating_type && (
                <div className="flex items-center gap-2">
                  <Flame size={20} className="text-orange-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{heatingTypeLabel}</span>
                </div>
              )}

              {/* Energiequelle */}
              {data.energy_source && (
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-yellow-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{energySourceLabel}</span>
                </div>
              )}

              {/* Energieausweis */}
              {data.energy_certificate && (
                <div className="flex items-center gap-2">
                  <FileCheck size={20} className="text-teal-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{energyCertificateLabel}</span>
                </div>
              )}

              {/* Hausgeld */}
              {data.monthly_fee && data.monthly_fee > 0 && (
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-rose-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(data.monthly_fee)} Hausgeld
                  </span>
                </div>
              )}

              {/* Verfügbar ab */}
              {data.available_from && (
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{availableFromLabel}</span>
                </div>
              )}

              {/* AfA-Typ */}
              {data.afa_type && (
                <div className="flex items-center gap-2">
                  <Calculator size={20} className={
                    data.afa_type === 'denkmal' ? 'text-amber-600' :
                    data.afa_type === 'neubau' ? 'text-green-600' :
                    data.afa_type === 'altbau' ? 'text-purple-600' : 'text-gray-600'
                  } />
                  <span className="text-base font-medium text-gray-900 dark:text-white">
                    AfA {data.afa_type === 'denkmal' ? 'Denkmal (9%)' :
                     data.afa_type === 'neubau' ? 'Neubau (5%)' :
                     data.afa_type === 'altbau' ? 'Altbau (2,5%)' : 'Bestand (2%)'}
                  </span>
                </div>
              )}

              {/* Grundstückfläche (nur für Häuser) */}
              {data.type === 'house' && data.plot_size && data.plot_size > 0 && (
                <div className="flex items-center gap-2">
                  <TreePine size={20} className="text-green-600" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{data.plot_size} m² Grundstück</span>
                </div>
              )}

              {/* Nutzfläche */}
              {data.usable_area && data.usable_area > 0 && (
                <div className="flex items-center gap-2">
                  <Layers size={20} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-base font-medium text-gray-900 dark:text-white">{data.usable_area} m² Nutzfläche</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI-Analyse & Cashflow Cards - Not shown for owner */}
        {propertyId && !isOwner && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* AI-Analyse Card */}
            {data.ai_investment_score !== undefined && data.ai_investment_score > 0 && (
              <a
                href={`/property/${propertyId}/ai-score`}
                className={`flex-1 rounded-xl border overflow-hidden block cursor-pointer hover:shadow-md transition-shadow p-4 ${
                  data.ai_investment_score >= 85
                    ? 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700'
                    : data.ai_investment_score >= 60
                      ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700'
                      : data.ai_investment_score >= 40
                        ? 'bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700'
                        : 'bg-rose-50 dark:bg-rose-900/40 border-rose-200 dark:border-rose-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* AI Score Ring Badge */}
                    <PropertyScoreBadge score={data.ai_investment_score} variant="ring" />
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">AI-Analyse</p>
                      <p className={`text-sm font-medium ${
                        data.ai_investment_score >= 85
                          ? 'text-green-600 dark:text-green-400'
                          : data.ai_investment_score >= 60
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : data.ai_investment_score >= 40
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        Score {(data.ai_investment_score / 10).toFixed(1)} / 10 – {
                          data.ai_investment_score >= 85 ? 'Sehr gut' :
                          data.ai_investment_score >= 60 ? 'Gut' :
                          data.ai_investment_score >= 40 ? 'OK' : 'Schwach'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              </a>
            )}

            {/* Rendite-Rechner Card - Farbe basierend auf Rendite */}
            {(() => {
              const rendite = data.yield_metrics?.brutto_rendite ?? data.evaluation?.gross_yield_percentage;

              // Karten-Farbe basierend auf Rendite: >= 7% hell grün, 5-7% grün, 3-5% amber, <3% rot
              const getCardColors = () => {
                if (rendite !== undefined && rendite !== null) {
                  if (rendite >= 7) return {
                    border: 'border-green-300 dark:border-green-700',
                    bg: 'bg-green-100 dark:bg-green-900/40',
                    iconColor: 'text-green-600 dark:text-green-400'
                  };
                  if (rendite >= 5) return {
                    border: 'border-emerald-200 dark:border-emerald-700',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
                    iconColor: 'text-emerald-600 dark:text-emerald-400'
                  };
                  if (rendite >= 3) return {
                    border: 'border-amber-200 dark:border-amber-700',
                    bg: 'bg-amber-50 dark:bg-amber-900/40',
                    iconColor: 'text-amber-600 dark:text-amber-400'
                  };
                  return {
                    border: 'border-rose-200 dark:border-rose-700',
                    bg: 'bg-rose-50 dark:bg-rose-900/40',
                    iconColor: 'text-rose-600 dark:text-rose-400'
                  };
                }
                return {
                  border: 'border-blue-200 dark:border-blue-700',
                  bg: 'bg-blue-50 dark:bg-blue-900/40',
                  iconColor: 'text-blue-600 dark:text-blue-400'
                };
              };

              const cardColors = getCardColors();

              return (
                <a
                  href={`/property/${propertyId}/calculator`}
                  className={`flex-1 rounded-xl border ${cardColors.border} ${cardColors.bg} overflow-hidden block cursor-pointer hover:shadow-md transition-shadow p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calculator size={40} className={`${cardColors.iconColor} flex-shrink-0`} />
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Rendite-Rechner</p>
                        {rendite !== undefined && rendite !== null ? (
                          <p className={`text-sm font-medium ${
                            rendite >= 7 ? 'text-green-600 dark:text-green-400' :
                            rendite >= 5 ? 'text-emerald-600 dark:text-emerald-400' :
                            rendite >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rendite.toFixed(1)}% Rendite
                          </p>
                        ) : (
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Berechnung starten →</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </a>
              );
            })()}
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
            <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden p-4">
              {/* Important Notes - Show if exists */}
              {data.important_notes && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-4">
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    {data.important_notes}
                  </p>
                </div>
              )}

              {/* Description Text - whitespace-pre-line preserves newlines for structured content */}
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base whitespace-pre-line">
                {isDescriptionExpanded || !isLongDescription ? data.description : previewText}
              </p>

              {/* Show more/less button */}
              {isLongDescription && (
                <button
                  onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                  className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
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
                <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 flex items-center gap-2">
                    <FileText size={20} className="text-gray-700 dark:text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objektunterlagen</h3>
                  </div>
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    <FileText size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p>Noch keine Unterlagen hochgeladen</p>
                    <p className="text-sm mt-1">
                      Lade PDFs, Grundrisse oder Energieausweise über das Chat-Feld hoch.
                    </p>
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
          <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                {data.owner?.avatar_url ? (
                  <img
                    src={data.owner.avatar_url}
                    alt={`${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim() || 'Anbieter'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-lg font-semibold">
                    {(data.owner?.first_name?.[0] || data.owner?.last_name?.[0] || 'A').toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name, Bio und E-Mail */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {data.owner?.first_name || data.owner?.last_name
                    ? `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim()
                    : 'Privater Anbieter'}
                </p>
                {data.owner?.bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {data.owner.bio}
                  </p>
                )}
                {(data.owner?.email || data.owner_profile?.email) && (
                  <a
                    href={`mailto:${data.owner?.email || data.owner_profile?.email}`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors mt-1"
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
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Die Vorschau wird aktualisiert, sobald Sie Informationen eingeben
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
