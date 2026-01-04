/**
 * TypeScript interfaces for create-listing page
 * Replaces all 'any' types with proper type definitions
 */

// AfA depreciation type for tax calculations
export type AfaType = 'bestand' | 'altbau' | 'neubau' | 'denkmal';

export interface ListingData {
  id?: string; // Property ID (set after creation)
  property_type?: 'apartment' | 'house' | 'land' | 'commercial';
  title?: string;
  location?: string; // City/area (e.g., "München")
  street_address?: string; // Street address (e.g., "Musterstraße 123")
  postal_code?: number; // Postal code (e.g., 80331)
  price?: number;
  sqm?: number;
  rooms?: number;
  plot_size?: number; // Grundstückfläche in qm (for houses)
  condition?: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation';
  description?: string;
  features?: string[];
  images?: string[];
  video_url?: string | null;
  documents?: PropertyDocument[];
  important_notes?: string;
  year_built?: number;
  floor_level?: string; // For apartments (e.g., "3", "EG")
  total_floors?: number; // Total number of floors (for houses)
  bathrooms?: number;
  balcony?: boolean;
  parking?: boolean;
  elevator?: boolean;
  furnished?: boolean;
  available_from?: string;
  heating_type?: 'central' | 'floor' | 'gas' | 'heat_pump' | 'district' | 'other';
  energy_efficiency_class?: string; // e.g., 'A+', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'
  commission?: number;
  commission_rate?: number; // Maklergebühren in %
  additional_costs?: number;
  monthly_fee?: number; // Hausgeld pro Monat in EUR
  monthly_rent?: number; // Mieteinnahme pro Monat in EUR
  afa_type?: AfaType; // AfA-Typ für Steuerberechnung
  // Provider contact info (for imported/external properties)
  provider_name?: string;
  provider_email?: string;
  provider_phone?: string;
  provider_company?: string;
  is_external?: boolean; // Mark as external/imported property
  // AI Rating fields (legacy)
  ai_score?: number;
  ai_rating_explanation?: string;
  strengths?: string[];
  weaknesses?: string[];
  opportunities?: string[];
  risks?: string[];
  // Seller evaluation
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
}

export interface YieldMetrics {
  brutto_rendite?: number;
  netto_rendite?: number;
  ek_rendite?: number;
  faktor?: number;
  monthly_cashflow?: number;
}

export interface RentalIncome {
  monthly_rent?: number;
  rent_per_sqm?: number;
  estimated_market_rent?: number;
  annual_rent?: number;
}

export interface CashflowCalculation {
  rental_income?: number;
  operating_expenses?: number;
  debt_service?: number;
  net_cashflow?: number;
  cashflow_details?: string;
}

export interface InvestmentEvaluation {
  overall_score?: number;
  yield_metrics?: YieldMetrics;
  rental_income?: RentalIncome;
  cashflow_calculation?: CashflowCalculation;
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
    location_analysis?: string;
    market_analysis?: string;
    rent_analysis?: string;
    financing_analysis?: string;
    interest_rate_90?: number;
    interest_rate_80?: number;
  };
  highlights?: string[];
  red_flags?: string[];
}

export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  extractedData?: ListingData;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UploadedImageResponse {
  original: string;
  thumbnail?: string;
  medium?: string;
}

export interface ImageUploadResult {
  success: boolean;
  data: UploadedImageResponse[];
  message?: string;
}

// Document types for property documents (Objektunterlagen)
export type DocumentCategory =
  | 'grundriss'
  | 'energieausweis'
  | 'expose'
  | 'sonstiges'
  | 'lageplan'
  | 'mietvertrag'
  | 'etw_protokoll'
  | 'kaufvertrag'
  | 'grundbuchauszug';

// Document visibility levels for access control
export type DocumentVisibility =
  | 'public'           // Immer sichtbar - Always visible to everyone
  | 'auto_approved'    // Automatisch nach Anfrage - Auto-approved when user requests
  | 'manual_approval'; // Nur manuell freigeben - Requires owner approval

export interface PropertyDocument {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  category: DocumentCategory;
  visibility: DocumentVisibility;
  mimetype: string;
  size: number;
  uploadedAt: string;
}

// Mapping: Category -> Default Visibility (for AI auto-categorization)
export const CATEGORY_TO_DEFAULT_VISIBILITY: Record<DocumentCategory, DocumentVisibility> = {
  grundriss: 'public',
  energieausweis: 'public',
  expose: 'public',
  lageplan: 'public',
  sonstiges: 'public',
  etw_protokoll: 'auto_approved',
  mietvertrag: 'manual_approval',
  kaufvertrag: 'manual_approval',
  grundbuchauszug: 'manual_approval',
};

// Visibility labels for UI
export const VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  public: 'Immer sichtbar',
  auto_approved: 'Automatisch nach Anfrage',
  manual_approval: 'Nur manuell freigeben',
};

// Visibility colors for UI
export const VISIBILITY_COLORS: Record<DocumentVisibility, { bg: string; text: string; border: string }> = {
  public: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  auto_approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  manual_approval: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

// Helper function to check if document requires access request
export const requiresAccessRequest = (visibility: DocumentVisibility): boolean => {
  return visibility !== 'public';
};

export const DOCUMENT_CATEGORIES: { value: DocumentCategory; label: string; defaultVisibility: DocumentVisibility }[] = [
  { value: 'grundriss', label: 'Grundriss', defaultVisibility: 'public' },
  { value: 'energieausweis', label: 'Energieausweis', defaultVisibility: 'public' },
  { value: 'expose', label: 'Exposé', defaultVisibility: 'public' },
  { value: 'lageplan', label: 'Lageplan', defaultVisibility: 'public' },
  { value: 'sonstiges', label: 'Sonstiges', defaultVisibility: 'public' },
  { value: 'etw_protokoll', label: 'ETW Protokoll', defaultVisibility: 'auto_approved' },
  { value: 'mietvertrag', label: 'Mietvertrag', defaultVisibility: 'manual_approval' },
  { value: 'kaufvertrag', label: 'Kaufvertrag', defaultVisibility: 'manual_approval' },
  { value: 'grundbuchauszug', label: 'Grundbuchauszug', defaultVisibility: 'manual_approval' },
];
