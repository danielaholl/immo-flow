/**
 * Zentrale Mapper-Funktion für Property-Daten
 *
 * Vermeidet Duplikation und garantiert Konsistenz über alle Pages hinweg.
 */

import type { PropertyPreviewData } from '../components/PropertyPreview';
import type { PropertyDocument } from '../create-listing/types';

/**
 * Property-Daten wie sie von der API kommen
 */
export interface PropertyFromAPI {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  location: string;
  street_address?: string | null;
  postal_code?: string | null;
  full_address?: string | null;
  sqm: number;
  rooms: number;
  bathrooms?: number | null;
  images?: string[] | null;
  video_url?: string | null;
  documents?: PropertyDocument[] | null;
  features?: string[] | null;
  highlights?: string[] | null;
  red_flags?: string[] | null;
  property_type?: string | null;
  status?: string;
  commission_rate?: number | null;
  require_address_consent?: boolean | null;
  yield?: number | null;
  year_built?: number | null;
  floor_level?: string | null;
  total_floors?: number | null;
  heating_type?: string | null;
  energy_source?: string | null;
  energy_certificate?: string | null;
  energy_efficiency_class?: string | null;
  monthly_fee?: number | null;
  usable_area?: number | null;
  usable_area_ratio?: string | null;
  condition?: string | null;
  available_from?: string | null;
  important_notes?: string | null;
  actual_monthly_rent?: number | null;
  ai_score?: number | null;
  ai_investment_score?: number | null;
  ai_detailed_evaluation?: any;
  ai_rating_explanation?: string | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  opportunities?: string[] | null;
  risks?: string[] | null;
  buyer_evaluation?: any;
  seller_evaluation?: any;
  is_external?: boolean | null;
  user_id?: string;
  // Provider contact (for imported properties)
  provider_contact?: {
    provider_name?: string | null;
    provider_email?: string | null;
    provider_phone?: string | null;
    provider_company?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
  days_online?: number;
  documents_count?: number;
  // Statistics
  total_views?: number;
  favorites_count?: number;
  rating_count?: number;
  avg_rating?: number;
  avg_suggested_price?: number;
  // Owner
  owner?: {
    id?: string;
    user_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    company?: string | null;
    avatar_url?: string | null;
    bio?: string | null;
    email?: string | null;
  } | null;
}

/**
 * Optionen für den Mapper
 */
export interface MapperOptions {
  /** Ist der aktuelle User der Eigentümer? (Owner-Daten werden dann nicht angezeigt) */
  isOwner?: boolean;
  /** Zusätzliche AI-Evaluation Daten (z.B. von separater Query) */
  aiEvaluation?: {
    location_score?: number;
    price_score?: number;
    yield_score?: number;
    appreciation_score?: number;
    features_score?: number;
    price_per_sqm?: number;
    market_average_price_per_sqm?: number;
    estimated_monthly_rent?: number;
    gross_yield_percentage?: number;
    location_analysis?: string;
    market_analysis?: string;
    rent_analysis?: string;
    financing_analysis?: string;
    interest_rate_90?: number;
    interest_rate_80?: number;
  } | null;
  /** Zusätzliche Buyer-Evaluation (z.B. aus State) */
  buyerEvaluation?: any;
}

/**
 * Mappt Property-Daten von der API zu PropertyPreviewData
 */
export function mapToPropertyPreviewData(
  property: PropertyFromAPI,
  options: MapperOptions = {}
): PropertyPreviewData {
  const { isOwner = false, aiEvaluation, buyerEvaluation } = options;

  // Extract detailed evaluation from JSONB
  const detailedEval = property.ai_detailed_evaluation as any;

  return {
    // Basis-Daten
    images: property.images || [],
    price: property.price || 0,
    commission_rate: property.commission_rate ?? undefined,
    location: property.location || '',
    address: property.street_address ?? undefined,
    postal_code: property.postal_code ?? undefined,
    title: property.title || '',
    type: property.property_type ?? undefined,
    sqm: property.sqm || 0,
    rooms: property.rooms || 0,
    description: property.description || '',
    features: property.features ?? undefined,
    yield: property.yield ?? undefined,
    highlights: property.highlights ?? undefined,
    red_flags: property.red_flags ?? undefined,
    ai_investment_score: property.ai_investment_score ?? property.ai_score ?? undefined,
    require_address_consent: property.require_address_consent ?? undefined,

    // Erweiterte Immobilien-Details
    monthly_fee: property.monthly_fee ?? undefined,
    usable_area: property.usable_area ?? undefined,
    usable_area_ratio: property.usable_area_ratio ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    total_floors: property.total_floors ?? undefined,
    floor_level: property.floor_level ?? undefined,
    available_from: property.available_from ?? undefined,
    year_built: property.year_built ?? undefined,
    heating_type: property.heating_type ?? undefined,
    energy_source: property.energy_source ?? undefined,
    energy_certificate: property.energy_certificate ?? undefined,
    energy_efficiency_class: property.energy_efficiency_class ?? undefined,
    condition: property.condition ?? undefined,
    important_notes: property.important_notes ?? undefined,
    days_online: property.days_online ?? undefined,

    // Mietdaten
    actual_monthly_rent: property.actual_monthly_rent ?? undefined,

    // AI-Analyse aus JSONB
    yield_metrics: detailedEval?.yield_metrics ?? undefined,
    rental_income: detailedEval?.rental_income ?? undefined,
    cashflow_calculation: detailedEval?.cashflow_calculation ?? undefined,
    financing_terms: detailedEval?.financing_terms ?? undefined,

    // AI-Evaluation: Prefer separate query, fallback to JSONB
    evaluation: aiEvaluation ? {
      location_score: aiEvaluation.location_score,
      price_score: aiEvaluation.price_score,
      yield_score: aiEvaluation.yield_score,
      appreciation_score: aiEvaluation.appreciation_score,
      features_score: aiEvaluation.features_score,
      price_per_sqm: aiEvaluation.price_per_sqm ?? detailedEval?.evaluation?.price_per_sqm,
      market_average_price_per_sqm: aiEvaluation.market_average_price_per_sqm,
      estimated_monthly_rent: aiEvaluation.estimated_monthly_rent,
      gross_yield_percentage: aiEvaluation.gross_yield_percentage,
      location_analysis: aiEvaluation.location_analysis,
      market_analysis: aiEvaluation.market_analysis,
      rent_analysis: aiEvaluation.rent_analysis,
      financing_analysis: aiEvaluation.financing_analysis,
      interest_rate_90: aiEvaluation.interest_rate_90,
      interest_rate_80: aiEvaluation.interest_rate_80,
    } : detailedEval?.evaluation ?? undefined,

    ai_recommendation: detailedEval?.ai_recommendation ?? undefined,

    // AI Rating fields
    ai_rating_explanation: property.ai_rating_explanation ?? undefined,
    strengths: property.strengths ?? undefined,
    weaknesses: property.weaknesses ?? undefined,
    opportunities: property.opportunities ?? undefined,
    risks: property.risks ?? undefined,

    // Buyer/Seller Evaluations
    buyer_evaluation: buyerEvaluation ?? property.buyer_evaluation ?? undefined,
    seller_evaluation: property.seller_evaluation ?? undefined,

    // Statistics (für Verkäufer-Ansicht)
    total_views: property.total_views ?? undefined,
    favorites_count: property.favorites_count ?? undefined,
    rating_count: property.rating_count ?? undefined,
    avg_rating: property.avg_rating ?? undefined,
    avg_suggested_price: property.avg_suggested_price ?? undefined,

    // Documents
    documents: (property.documents as unknown as PropertyDocument[]) || [],
    documents_count: property.documents_count ?? property.documents?.length ?? 0,

    // Owner (nur wenn nicht Eigentümer)
    owner: property.owner && !isOwner ? {
      first_name: property.owner.first_name ?? undefined,
      last_name: property.owner.last_name ?? undefined,
      company: property.owner.company ?? undefined,
      avatar_url: property.owner.avatar_url ?? undefined,
      phone: property.owner.phone ?? undefined,
      bio: property.owner.bio ?? undefined,
      email: property.owner.email ?? undefined,
    } : undefined,

    // Provider contact (for imported/external properties)
    provider_contact: property.provider_contact ? {
      provider_name: property.provider_contact.provider_name ?? undefined,
      provider_email: property.provider_contact.provider_email ?? undefined,
      provider_phone: property.provider_contact.provider_phone ?? undefined,
      provider_company: property.provider_contact.provider_company ?? undefined,
    } : undefined,

    // Is external flag
    is_external: property.is_external ?? undefined,
  };
}
