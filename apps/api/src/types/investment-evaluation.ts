/**
 * Investment Evaluation Types
 * Types and interfaces for property investment evaluation
 */

export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  address?: string;
  price: number;
  rooms: number;
  sqm: number;
  features?: string[];
  year_built?: number;
}

export interface LocationAnalysis {
  score: number; // 0-100
  reasoning: string;
  infrastructure_rating: number;
  neighborhood_rating: number;
  development_potential: number;
}

export interface AppreciationAnalysis {
  score: number; // 0-100
  reasoning: string;
  market_trend: 'steigend' | 'stabil' | 'fallend';
  growth_potential: number;
}

export interface MarketPriceAnalysis {
  average_price_per_sqm: number; // Current market average price per sqm
  price_range_min: number; // Lower range
  price_range_max: number; // Upper range
  reasoning: string;
}

export interface RentEstimation {
  estimated_rent_per_sqm: number;
  estimated_monthly_rent: number;
  reasoning: string;
  market_comparison: string;
}

export interface FinancingTerms {
  interest_rate?: number; // Annual interest rate in % (deprecated, use interest_rate_90 or interest_rate_80)
  interest_rate_90?: number; // Interest rate for 90% LTV
  interest_rate_80?: number; // Interest rate for 80% LTV
  loan_to_value: number; // LTV in % (e.g., 90)
  amortization_rate: number; // Tilgung in % (e.g., 1)
  loan_term_years: number; // Loan term in years
  reasoning: string;
}

export interface InvestmentEvaluationResult {
  overall_score: number;
  color_rating: 'green' | 'yellow' | 'red';
  location_score: number;
  price_score: number;
  yield_score: number;
  appreciation_score: number;
  features_score: number;
  price_per_sqm: number;
  estimated_monthly_rent: number;
  estimated_market_rent_per_sqm: number;
  annual_rent: number;
  gross_yield_percentage: number;
}
