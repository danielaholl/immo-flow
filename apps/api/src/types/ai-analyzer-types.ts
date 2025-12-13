/**
 * AI Analyzer Types
 * Types for AI-powered property analysis and ratings
 */
import type { ScrapedPropertyData } from '../services/property-scraper.js';

export type AIRating = 'top_deal' | 'good' | 'average' | 'poor' | 'avoid';
export type EvaluationViewType = 'seller' | 'buyer_selfuse' | 'buyer_investor';

export interface PropertyAnalysis {
  aiRating: AIRating;
  aiRatingExplanation: string;
  investmentScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  // Financial data
  estimatedRent?: number; // Estimated monthly rent
  estimatedOperatingCosts?: number; // Monthly operating costs (Nebenkosten, Hausgeld)
  estimatedMaintenanceCosts?: number; // Monthly maintenance reserve
}

// Seller-focused evaluation
export interface SellerEvaluation {
  viewType: 'seller';
  marketValueMin: number;
  marketValueMax: number;
  recommendedPrice: number;
  comparableSales: number;
  marketingDurationMin: number;
  marketingDurationMax: number;
  priceAssessment: string; // "unter Marktwert", "marktgerecht", "über Marktwert"
  summary: string;
  sellingPoints: string[];
  improvementSuggestions: string[];
}

// Buyer self-use evaluation
export interface BuyerSelfuseEvaluation {
  viewType: 'buyer_selfuse';
  livingScore: number; // 0-100
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
}

// Buyer investor evaluation
export interface BuyerInvestorEvaluation {
  viewType: 'buyer_investor';
  investmentScore: number; // 0-100
  grossYield: number; // Bruttorendite in %
  netYield: number; // Nettorendite in %
  monthlyBudget: number; // Cashflow nach Finanzierung
  rentMultiplier: number; // Mietmultiplikator
  microLocation: string; // A, B+, B, C etc.
  microLocationTrend: string; // "aufstrebend", "stabil", "rückläufig"
  riskLevel: string; // "gering", "mittel", "hoch"
  riskFactors: string[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export type ViewTypeEvaluation = SellerEvaluation | BuyerSelfuseEvaluation | BuyerInvestorEvaluation;

export interface AIAnalysisResponse {
  rating: string;
  investmentScore: number;
  explanation: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
  estimatedRent?: number;
  estimatedOperatingCosts?: number;
  estimatedMaintenanceCosts?: number;
}
