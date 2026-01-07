'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Bath, Sparkles, DoorClosed, Square, Layers, Building2, Clock, Flame, Zap, ChevronDown, ChevronRight, Heart, Mail, FileText, Loader2, Landmark, TrendingDown, TrendingUp, Equal, Info, ArrowUpDown, Calendar, Wallet, FileCheck, TreePine, Calculator, Home, X } from 'lucide-react';
import { PropertyScoreBadge, PropertyTypeBadge, type PropertyType, calculateQuickBreakEven, type BreakEvenResult } from '@rendito/ui';
import { LocationDisplay } from './LocationDisplay';
import { MarketComparisonBar } from './MarketComparisonBar';


// AIInvestmentEvaluation und InvestmentScoreBadge auskommentiert - nur stichpunktartige Bewertung
// import { AIInvestmentEvaluation, InvestmentScoreBadge } from '@rendito/ui';

import type { PropertyDocument, DocumentCategory } from '../create-listing/types';
import { PropertyDocumentsList } from './PropertyDocumentsList';
import { DocumentVisibilityManager } from './DocumentVisibilityManager';
import { SellerKnowledgeManager } from './SellerKnowledgeManager';
import { ProviderContactEditor } from './ProviderContactEditor';
import { trpc } from '@/app/providers/TRPCProvider';

// Category labels for document display
const categoryLabels: Record<DocumentCategory, string> = {
  grundriss: 'Grundriss',
  energieausweis: 'Energieausweis',
  expose: 'Exposé',
  lageplan: 'Lageplan',
  sonstiges: 'Sonstiges',
  etw_protokoll: 'ETW Protokoll',
  mietvertrag: 'Mietvertrag',
  kaufvertrag: 'Kaufvertrag',
  grundbuchauszug: 'Grundbuchauszug',
};

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
  // Provider contact info (for external/imported properties)
  provider_contact?: {
    provider_name?: string | null;
    provider_email?: string | null;
    provider_phone?: string | null;
    provider_company?: string | null;
  } | null;
  is_external?: boolean;
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
  /** Hide document visibility controls (for import mode / buyer view) */
  hideDocumentVisibilityControls?: boolean;
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
  /** Whether the device is mobile (from parent useIsMobile hook) */
  isMobile?: boolean;
  /** Hide metrics cards (AI Score, Rendite, Kaufen vs Mieten) - used in import mode */
  hideMetricsCards?: boolean;
  /** Show provider contact editor (triggered by user request in import mode) */
  showProviderContactEditor?: boolean;
  /** Callback after provider contact update (to refetch data) */
  onProviderContactUpdate?: () => void;
  /** Whether this is import mode (to show provider contact before property is saved) */
  isImportMode?: boolean;
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
  hideDocumentVisibilityControls = false,
  userPropertyParams,
  onSaveUserPropertyParams,
  isSavingUserPropertyParams = false,
  isMobile = false,
  hideMetricsCards = false,
  showProviderContactEditor = false,
  onProviderContactUpdate,
  isImportMode = false,
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
  // State for documents accordion
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false);
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
      {/* Property Details */}
      <div>
        {/* Price Card - Premium Gradient */}
        <div className="mb-6 px-4 pb-4 pt-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
          {/* Badge Row - Property Type links, Status rechts */}
          <div className="flex items-center justify-between mb-3">
            {/* Property Type Badge - links */}
            {data.type && (
              <PropertyTypeBadge
                propertyType={data.type as PropertyType}
                size="md"
                variant="dark"
              />
            )}

            {/* Status Badge - rechts */}
            {statusBadge && (
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                {statusBadge.label}
              </span>
            )}
          </div>

          {/* Title, Location */}
          <div className="mb-4">
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
          <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Left: Kaufpreis */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">Kaufpreis</p>
              <h1 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '40px', lineHeight: '1' }}>
                {data.price > 0 ? formatPrice(data.price) : '-'}
              </h1>
            </div>

            {/* Right: Preis pro m² */}
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-300 mb-1">Preis pro m²</p>
              <h2 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: '28px', lineHeight: '1' }}>
                {pricePerSqm > 0 ? formatPrice(pricePerSqm) : '-'}
              </h2>
            </div>
          </div>

          {/* Commission */}
          <p className={`text-base mt-1 ${
            data.commission_rate != null && data.commission_rate > 0
              ? 'text-gray-600 dark:text-gray-400'
              : 'text-emerald-600 dark:text-emerald-400 font-medium'
          }`}>
            {data.commission_rate != null && data.commission_rate > 0
              ? `Provision: ${Number(data.commission_rate).toFixed(2).replace('.', ',')} % inkl. MwSt.`
              : '✓ Provisionsfrei'}
          </p>

        </div>

        {/* AI-Analyse & Cashflow Cards - Not shown for owner or in import mode */}
        {propertyId && !isOwner && !hideMetricsCards && (
          <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {/* AI-Analyse Card */}
            {data.ai_investment_score !== undefined && data.ai_investment_score > 0 && (
              <a
                href={`/property/${propertyId}/ai-score`}
                className={`rounded-xl border overflow-hidden block cursor-pointer hover:shadow-md transition-shadow p-4 ${
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
                      <p className="text-lg font-bold text-gray-900 dark:text-white">AI-Score</p>
                      <p className={`text-sm font-medium ${
                        data.ai_investment_score >= 85
                          ? 'text-green-600 dark:text-green-400'
                          : data.ai_investment_score >= 60
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : data.ai_investment_score >= 40
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {(data.ai_investment_score / 10).toFixed(1)}/10
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
                  href={`/property/${propertyId}/calculator?mode=investor`}
                  className={`rounded-xl border ${cardColors.border} ${cardColors.bg} overflow-hidden block cursor-pointer hover:shadow-md transition-shadow p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calculator size={40} className={`${cardColors.iconColor} flex-shrink-0`} />
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">Rendite</p>
                        {rendite !== undefined && rendite !== null ? (
                          <p className={`text-sm font-medium ${
                            rendite >= 7 ? 'text-green-600 dark:text-green-400' :
                            rendite >= 5 ? 'text-emerald-600 dark:text-emerald-400' :
                            rendite >= 3 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rendite.toFixed(1)}%
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

            {/* Eigenheim Card - Traffic Light basierend auf buyVsRentYears */}
            {(() => {
              // Kaufen vs Mieten Card - mit Quick Calculation Fallback
              const buyVsRentYears = (() => {
                // Priorität 1: AI Evaluation vorhanden
                if (data.buyer_evaluation?.buyer_selfuse?.buyVsRentYears) {
                  return {
                    years: data.buyer_evaluation.buyer_selfuse.buyVsRentYears,
                    isQuick: false,
                  };
                }

                // Priorität 2: Quick Calculation
                const quickResult = calculateQuickBreakEven({
                  purchasePrice: data.price,
                  sqm: data.sqm,
                  yearBuilt: data.year_built,
                  estimatedRentPerSqm: data.rental_income?.rent_per_sqm,
                });

                return quickResult
                  ? { years: quickResult.years, isQuick: true, confidence: quickResult.confidence }
                  : null;
              })();

              // Karten-Farbe und Label basierend auf Break-Even Jahren
              const getCardColors = () => {
                if (buyVsRentYears !== null && buyVsRentYears.years !== undefined) {
                  // Kaufen lohnt sich (<=15 Jahre)
                  if (buyVsRentYears.years <= 15) return {
                    border: 'border-emerald-200 dark:border-emerald-700',
                    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
                    iconColor: 'text-emerald-600 dark:text-emerald-400',
                    label: 'Kaufen'
                  };
                  // Abwägen (15-25 Jahre)
                  if (buyVsRentYears.years <= 25) return {
                    border: 'border-amber-200 dark:border-amber-700',
                    bg: 'bg-amber-50 dark:bg-amber-900/40',
                    iconColor: 'text-amber-600 dark:text-amber-400',
                    label: 'Abwägen'
                  };
                  // Mieten günstiger (>25 Jahre)
                  return {
                    border: 'border-rose-200 dark:border-rose-700',
                    bg: 'bg-rose-50 dark:bg-rose-900/40',
                    iconColor: 'text-rose-600 dark:text-rose-400',
                    label: 'Mieten'
                  };
                }
                return {
                  border: 'border-blue-200 dark:border-blue-700',
                  bg: 'bg-blue-50 dark:bg-blue-900/40',
                  iconColor: 'text-blue-600 dark:text-blue-400',
                  label: 'Kaufen vs Mieten'
                };
              };

              const cardColors = getCardColors();

              // Status-Icon basierend auf buyVsRentYears
              const getStatusIcon = () => {
                if (buyVsRentYears === null || buyVsRentYears.years === undefined) {
                  return null;
                }

                // Kaufen lohnt sich (<=15 Jahre)
                if (buyVsRentYears.years <= 15) {
                  return <TrendingUp size={14} />;
                }

                // Abwägen (15-25 Jahre)
                if (buyVsRentYears.years <= 25) {
                  return <Equal size={14} />;
                }

                // Mieten ist günstiger
                return <TrendingDown size={14} />;
              };

              const statusIcon = getStatusIcon();

              return (
                <a
                  href={`/property/${propertyId}/calculator?mode=eigennutzer`}
                  className={`rounded-xl border ${cardColors.border} ${cardColors.bg} overflow-hidden block cursor-pointer hover:shadow-md transition-shadow p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Home size={40} className={`${cardColors.iconColor} flex-shrink-0`} />
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{cardColors.label}</p>
                        {buyVsRentYears !== null && buyVsRentYears.years !== undefined ? (
                          <p className={`text-sm font-medium ${cardColors.iconColor} flex items-center gap-1`}>
                            {statusIcon}
                            {buyVsRentYears.years} Jahre
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
                  <p className="text-base text-gray-700 dark:text-white leading-relaxed">
                    {data.important_notes}
                  </p>
                </div>
              )}

              {/* Description Text - whitespace-pre-line preserves newlines for structured content */}
              <p className="text-gray-700 dark:text-white leading-relaxed text-base whitespace-pre-line">
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

              {/* Provider/Owner Contact Information - Display with avatar */}
              {(() => {
                // Check for provider_contact data (imported properties)
                const hasProviderData = data.provider_contact && (
                  data.provider_contact.provider_name ||
                  data.provider_contact.provider_email ||
                  data.provider_contact.provider_phone ||
                  data.provider_contact.provider_company
                );

                // Check for owner data (normal properties)
                const hasOwnerData = data.owner && !data.is_external && (
                  data.owner.first_name ||
                  data.owner.last_name ||
                  data.owner.email ||
                  data.owner_profile?.email
                );

                // Priority: provider_contact for imported, owner for normal properties
                if (hasProviderData && data.provider_contact) {
                  // Store provider contact in a local variable for type narrowing
                  const providerContact = data.provider_contact;

                  // Build provider text from available fields
                  const providerParts = [];

                  if (providerContact.provider_name) {
                    let namePart = providerContact.provider_name;
                    if (providerContact.provider_company) {
                      namePart += ` (${providerContact.provider_company})`;
                    }
                    providerParts.push(namePart);
                  } else if (providerContact.provider_company) {
                    providerParts.push(providerContact.provider_company);
                  }

                  if (providerContact.provider_phone) {
                    providerParts.push(`Tel. ${providerContact.provider_phone}`);
                  }

                  if (providerContact.provider_email) {
                    providerParts.push(`E-Mail: ${providerContact.provider_email}`);
                  }

                  const providerText = providerParts.join(', ');

                  return (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-gray-700 dark:text-white leading-relaxed text-base">
                        {providerText}
                      </p>
                    </div>
                  );
                } else if (hasOwnerData && data.owner) {
                  // Build owner text from name and email
                  const ownerParts = [];

                  const ownerName = `${data.owner.first_name || ''} ${data.owner.last_name || ''}`.trim();
                  if (ownerName) {
                    ownerParts.push(ownerName);
                  } else {
                    ownerParts.push('Privater Anbieter');
                  }

                  const ownerEmail = data.owner.email || data.owner_profile?.email;
                  if (ownerEmail) {
                    ownerParts.push(`E-Mail: ${ownerEmail}`);
                  }

                  const ownerText = ownerParts.join(', ');

                  return (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                        {data.owner?.avatar_url ? (
                          <img
                            src={data.owner.avatar_url}
                            alt={ownerName || 'Anbieter'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm font-semibold">
                            {(data.owner?.first_name?.[0] || data.owner?.last_name?.[0] || 'A').toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Contact text */}
                      <p className="text-gray-700 dark:text-white leading-relaxed text-base">
                        {ownerText}
                      </p>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          );
        })()}

        {/* Warning wenn description fehlt (für Debugging) */}
        {!data.description && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl border border-yellow-200 dark:border-yellow-700 p-4">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              ⚠️ Keine Beschreibung vorhanden. Die KI hat noch keine Beschreibung generiert.
            </p>
          </div>
        )}

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
          const showVisibilityManager = onDocumentsChange && hasDocuments && !hideDocumentVisibilityControls;
          const showEmptyState = onDocumentsChange && !hasDocuments;
          const showSimpleList = onDocumentsChange && hasDocuments && hideDocumentVisibilityControls;

          return (
            <>
              {/* Document Visibility Manager - Show in create-listing for owner to manage visibility */}
              {showVisibilityManager && (
                <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Clickable Header */}
                  <button
                    onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-gray-700 dark:text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objektunterlagen</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-300 font-normal">
                        ({data.documents?.length || 0} {data.documents?.length === 1 ? 'Datei' : 'Dateien'})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDocumentsExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expandable Content */}
                  {isDocumentsExpanded && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <DocumentVisibilityManager
                        documents={data.documents || []}
                        onDocumentsChange={onDocumentsChange}
                        onDocumentRemove={onDocumentRemove}
                        onDocumentClick={handleDocumentClick}
                        defaultExpanded={true}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Simple Document List - Show for imported properties in edit mode */}
              {showSimpleList && (
                <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Clickable Header */}
                  <button
                    onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-gray-700 dark:text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objektunterlagen</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-300 font-normal">
                        ({data.documents?.length || 0} {data.documents?.length === 1 ? 'Datei' : 'Dateien'})
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDocumentsExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expandable Content */}
                  {isDocumentsExpanded && (
                    <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="space-y-2">
                        {data.documents?.map((doc) => {
                          const thumbnailSrc = doc.thumbnailUrl || (doc.mimetype?.startsWith('image/') ? doc.url : null);
                          const isSelected = selectedDocumentId === doc.id;

                          return (
                            <div
                              key={doc.id}
                              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isSelected
                                  ? 'bg-gray-900 dark:bg-gray-700'
                                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <button
                                onClick={() => handleDocumentClick(isSelected ? null : doc)}
                                className="flex-1 flex items-center gap-3 min-w-0"
                              >
                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                                  {thumbnailSrc ? (
                                    <img src={thumbnailSrc} alt={doc.filename} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center ${isSelected ? 'bg-gray-800 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-900'}`}>
                                      <FileText size={24} className={isSelected ? 'text-white' : 'text-gray-400'} />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                    {doc.filename}
                                  </p>
                                  <p className={`text-xs ${isSelected ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {categoryLabels[doc.category]}
                                  </p>
                                </div>
                              </button>
                              {onDocumentRemove && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDocumentRemove(doc.id);
                                  }}
                                  className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Dokument löschen"
                                >
                                  <X size={18} className="text-red-600 dark:text-red-400" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State - Show in edit mode when no documents */}
              {showEmptyState && (
                <div className="mb-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Clickable Header */}
                  <button
                    onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-gray-700 dark:text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Objektunterlagen</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-300 font-normal">(0 Dateien)</span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDocumentsExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expandable Empty State */}
                  {isDocumentsExpanded && (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400 animate-in fade-in slide-in-from-top-2 duration-200">
                      <FileText size={48} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p>Noch keine Unterlagen hochgeladen</p>
                      <p className="text-sm mt-1">
                        Lade PDFs, Grundrisse oder Energieausweise über das Chat-Feld hoch.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Document List - Show for viewers (non-owners) or when no visibility manager */}
              {/* Access request form is now integrated inside PropertyDocumentsList */}
              {!showVisibilityManager && !showEmptyState && !showSimpleList && (
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
                  hideAccessInfo={hideDocumentVisibilityControls}
                  isMobile={isMobile}
                />
              )}
            </>
          );
        })()}

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
