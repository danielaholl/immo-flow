/**
 * TypeScript interfaces for create-listing page
 * Replaces all 'any' types with proper type definitions
 */

export interface ListingData {
  id?: string; // Property ID (set after creation)
  property_type?: 'apartment' | 'house' | 'land' | 'commercial';
  title?: string;
  location?: string; // City/area (e.g., "München")
  address?: string; // Street address (e.g., "Musterstraße 123")
  postal_code?: string; // Postal code (e.g., "80331")
  price?: number;
  sqm?: number;
  rooms?: number;
  plot_size?: number; // Grundstückfläche in qm (for houses)
  condition?: 'new' | 'first_occupancy' | 'renovated' | 'maintained' | 'needs_renovation';
  description?: string;
  features?: string[];
  images?: string[];
  video_url?: string | null;
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
  additional_costs?: number;
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
