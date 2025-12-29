'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Home, Euro, Target, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';
import { InvestmentScoreBadge } from '@rendito/ui';

// Utility: Score von 0-100 auf 1-5 konvertieren
const toDisplayScore = (score: number): number => {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
};

// Utility: Score-Farbberechnung (1-5 Skala)
// 5 = top, 4 = gut, 3 = ok, 2 = schwach, 1 = nein
const getScoreColor = (score: number): { color: string; label: string } => {
  const displayScore = toDisplayScore(score);
  if (displayScore >= 4) return { color: '#22C55E', label: displayScore === 5 ? 'Top' : 'Gut' };
  if (displayScore === 3) return { color: '#EAB308', label: 'OK' };
  return { color: '#EF4444', label: displayScore === 2 ? 'Schwach' : 'Nein' };
};

// Utility: Preisformatierung
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

// Types for evaluations
export interface SellerEvaluation {
  viewType?: 'seller';
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
}

export interface BuyerSelfuseEvaluation {
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
}

export interface BuyerInvestorEvaluation {
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
  // Verhandlungspreis
  negotiationPrice?: number;
  negotiationDiscount?: number;
  negotiationReasoning?: string;
}

export interface BuyerEvaluation {
  buyer_selfuse?: BuyerSelfuseEvaluation;
  buyer_investor?: BuyerInvestorEvaluation;
}

export interface AIEvaluationPanelProps {
  mode: 'buyer' | 'seller';
  sellerEvaluation?: SellerEvaluation;
  buyerEvaluation?: BuyerEvaluation;
  isLoading?: boolean;
  onTriggerEvaluation: (viewType: 'seller' | 'buyer_selfuse' | 'buyer_investor') => void;
  className?: string;
}

export function AIEvaluationPanel({
  mode,
  sellerEvaluation,
  buyerEvaluation,
  isLoading = false,
  onTriggerEvaluation,
  className = '',
}: AIEvaluationPanelProps) {
  // State for collapsible panel - starts collapsed (must be before any early returns)
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine if we have existing evaluation
  const hasSellerEvaluation = !!sellerEvaluation;
  const hasBuyerSelfuseEvaluation = !!buyerEvaluation?.buyer_selfuse;
  const hasBuyerInvestorEvaluation = !!buyerEvaluation?.buyer_investor;
  const hasBuyerEvaluation = hasBuyerSelfuseEvaluation || hasBuyerInvestorEvaluation;

  const hasEvaluation = mode === 'seller' ? hasSellerEvaluation : hasBuyerEvaluation;

  // Handler for triggering evaluation
  const handleStartEvaluation = () => {
    if (mode === 'seller') {
      onTriggerEvaluation('seller');
    } else {
      // For buyer mode, trigger both evaluations
      // The component will show results as they come in
      onTriggerEvaluation('buyer_investor');
    }
  };

  // Handler for refreshing evaluation
  const handleRefreshEvaluation = () => {
    handleStartEvaluation();
  };

  // Compact box style (like KI-Marktwertanalyse) - show when no evaluation exists
  if (!hasEvaluation && !isLoading) {
    return (
      <div className={`bg-gradient-to-r ${mode === 'seller' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-purple-50 to-indigo-50 border-purple-200'} rounded-2xl border p-4 sm:p-6 ${className}`}>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Sparkles size={20} className={`flex-shrink-0 ${mode === 'seller' ? 'text-emerald-600' : 'text-purple-600'} mt-0.5`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                AI-Score
              </h4>
              <p className="text-gray-600 text-sm">
                {mode === 'seller'
                  ? 'Erhalte eine KI-basierte Verkaufsanalyse mit Marktwerteinschätzung und Vermarktungstipps.'
                  : 'Erhalte eine KI-basierte Analyse dieser Immobilie mit Wohn-Score und Investment-Score.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleStartEvaluation}
            className={`w-full md:w-auto flex-shrink-0 px-4 sm:px-6 py-3 ${mode === 'seller' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'} text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg`}
          >
            <Sparkles size={18} />
            <span className="whitespace-nowrap">AI-Score starten</span>
          </button>
        </div>
      </div>
    );
  }

  // Loading state - compact inline style
  if (isLoading) {
    return (
      <div className={`bg-gradient-to-r ${mode === 'seller' ? 'from-emerald-50 to-teal-50 border-emerald-200' : 'from-purple-50 to-indigo-50 border-purple-200'} rounded-2xl border p-4 sm:p-6 ${className}`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 border-4 ${mode === 'seller' ? 'border-emerald-200' : 'border-purple-200'} rounded-full`}></div>
            <div className={`w-10 h-10 border-4 ${mode === 'seller' ? 'border-emerald-600' : 'border-purple-600'} border-t-transparent rounded-full animate-spin absolute top-0 left-0`}></div>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">KI-Analyse läuft...</p>
            <p className="text-xs sm:text-sm text-gray-600">
              Bewertung wird erstellt
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Results view - collapsible panel with results
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Collapsible Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full p-4 sm:p-5 cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          {/* Links: Titel */}
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className={`flex-shrink-0 ${mode === 'seller' ? 'text-emerald-600' : 'text-purple-600'}`} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              AI-Score
            </h3>
          </div>

          {/* Mitte: Score Badge (nur Buyer Mode) */}
          {mode === 'buyer' && buyerEvaluation?.buyer_investor && (() => {
            const scoreInfo = getScoreColor(buyerEvaluation.buyer_investor.investmentScore);
            return (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ backgroundColor: `${scoreInfo.color}15` }}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: scoreInfo.color }}
                />
                <span
                  className="text-base font-bold"
                  style={{ color: scoreInfo.color }}
                >
                  {Math.round(buyerEvaluation.buyer_investor.investmentScore)}
                </span>
                <span
                  className="text-sm font-medium hidden sm:inline"
                  style={{ color: scoreInfo.color }}
                >
                  {scoreInfo.label}
                </span>
              </div>
            );
          })()}

          {/* Rechts: Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Neu bewerten Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshEvaluation();
              }}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${mode === 'seller' ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-purple-100 text-purple-600'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Lädt...' : 'Neu generieren'}
            </button>
            <ChevronDown
              size={20}
              className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Key Metrics Cards - nur für Seller Mode */}
        {mode === 'seller' && sellerEvaluation && (
          <div className="grid gap-2 sm:gap-3 grid-cols-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Marktwert</div>
              <div className="text-lg font-bold text-gray-900">
                {formatPrice(sellerEvaluation.recommendedPrice)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Vermarktungsdauer</div>
              <div className="text-lg font-bold text-gray-900">
                {sellerEvaluation.marketingDurationMin}-{sellerEvaluation.marketingDurationMax} Wo.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-gray-100">
          <div className="pt-4">
            {/* Results - Seller Mode */}
            {mode === 'seller' && sellerEvaluation && (
              <SellerResults evaluation={sellerEvaluation} />
            )}

            {/* Results - Buyer Mode */}
            {mode === 'buyer' && (
              <BuyerResults
                selfuseEvaluation={buyerEvaluation?.buyer_selfuse}
                investorEvaluation={buyerEvaluation?.buyer_investor}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Seller Results Component
function SellerResults({ evaluation }: { evaluation: SellerEvaluation }) {
  return (
    <div className="space-y-4">
      {/* Market Value */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Euro size={16} className="text-green-600" />
          <h4 className="text-sm font-medium text-gray-700">Marktwertanalyse</h4>
        </div>
        <ul className="space-y-1.5 text-base leading-relaxed">
          <li className="flex">
            <span className="text-gray-700 w-[55%] flex-shrink-0">Geschätzter Marktwert:</span>
            <span className="font-semibold text-gray-900 flex-1 text-right">
              {formatPrice(evaluation.marketValueMin)} - {formatPrice(evaluation.marketValueMax)}
            </span>
          </li>
          <li className="flex">
            <span className="text-gray-700 w-[55%] flex-shrink-0">Empfohlener Preis:</span>
            <span className="font-semibold text-green-600 flex-1 text-right">{formatPrice(evaluation.recommendedPrice)}</span>
          </li>
          <li className="flex">
            <span className="text-gray-700 w-[55%] flex-shrink-0">Preiseinschätzung:</span>
            <span className="font-semibold text-gray-900 flex-1 text-right">{evaluation.priceAssessment}</span>
          </li>
          <li className="flex">
            <span className="text-gray-700 w-[55%] flex-shrink-0">Vergleichbare Verkäufe:</span>
            <span className="font-semibold text-gray-900 flex-1 text-right">{evaluation.comparableSales} in der Region</span>
          </li>
        </ul>
      </div>

      {/* Marketing Duration */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-blue-600" />
          <h4 className="text-sm font-medium text-gray-700">Vermarktung</h4>
        </div>
        <ul className="space-y-1.5 text-base leading-relaxed">
          <li className="flex">
            <span className="text-gray-700 w-[55%] flex-shrink-0">Erwartete Vermarktungsdauer:</span>
            <span className="font-semibold text-gray-900 flex-1 text-right">
              {evaluation.marketingDurationMin} - {evaluation.marketingDurationMax} Wochen
            </span>
          </li>
        </ul>
      </div>

      {/* Selling Points */}
      {evaluation.sellingPoints && evaluation.sellingPoints.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-green-600" />
            <h4 className="text-sm font-medium text-gray-700">Verkaufsargumente</h4>
          </div>
          <ul className="space-y-1 text-base leading-relaxed">
            {evaluation.sellingPoints.slice(0, 5).map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-500 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions */}
      {evaluation.improvementSuggestions && evaluation.improvementSuggestions.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h4 className="text-sm font-medium text-gray-700">Verbesserungsvorschläge</h4>
          </div>
          <ul className="space-y-1 text-base leading-relaxed">
            {evaluation.improvementSuggestions.slice(0, 5).map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      {evaluation.summary && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-base text-gray-700 leading-relaxed">{evaluation.summary}</p>
        </div>
      )}
    </div>
  );
}

// Buyer Results Component
function BuyerResults({
  selfuseEvaluation,
  investorEvaluation,
}: {
  selfuseEvaluation?: BuyerSelfuseEvaluation;
  investorEvaluation?: BuyerInvestorEvaluation;
}) {
  return (
    <div className="space-y-4">
      {/* Wohn-Score (Selbstnutzer) */}
      {selfuseEvaluation && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Home size={16} className="text-blue-600" />
            <h4 className="text-sm font-medium text-gray-700">Wohn-Score</h4>
          </div>
          <ul className="space-y-1.5 text-base leading-relaxed">
            <li className="flex items-center">
              <span className="text-gray-700 w-[55%] flex-shrink-0">Wohn-Score:</span>
              <span className="flex-1 flex justify-end">
                <InvestmentScoreBadge score={selfuseEvaluation.livingScore} size="sm" />
              </span>
            </li>
            <li className="flex">
              <span className="text-gray-700 w-[55%] flex-shrink-0">Lagequalität:</span>
              <span className="font-semibold text-gray-900 flex-1 text-right">{selfuseEvaluation.locationQuality}</span>
            </li>
            <li className="flex">
              <span className="text-gray-700 w-[55%] flex-shrink-0">Einkaufsmöglichkeiten:</span>
              <span className="font-semibold text-gray-900 flex-1 text-right">{selfuseEvaluation.shoppingFacilities}</span>
            </li>
            <li className="flex">
              <span className="text-gray-700 w-[55%] flex-shrink-0">Kaufen vs. Mieten:</span>
              <span className="font-semibold text-gray-900 flex-1 text-right">
                {selfuseEvaluation.buyVsRentYears} Jahre ({selfuseEvaluation.buyVsRentAssessment})
              </span>
            </li>
            <li className="flex">
              <span className="text-gray-700 w-[55%] flex-shrink-0">Lärmpegel:</span>
              <span className="font-semibold text-gray-900 flex-1 text-right">{selfuseEvaluation.noiseLevel}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Separator if both exist */}
      {selfuseEvaluation && investorEvaluation && <div className="border-t border-gray-200" />}

      {/* Investment-Score (Investor) - Verhandlungspreis, Mikrolage und Risiko */}
      {investorEvaluation && (
        <div className="space-y-4">
          {investorEvaluation.negotiationPrice && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Verhandlungspreis</div>
              <div className="text-gray-900 font-semibold" style={{ fontSize: '20px' }}>
                {formatPrice(investorEvaluation.negotiationPrice)}
                {investorEvaluation.negotiationDiscount && (
                  <span className="font-normal ml-2">
                    (-{investorEvaluation.negotiationDiscount}%)
                  </span>
                )}
              </div>
              {investorEvaluation.negotiationReasoning && (
                <div className="text-base text-gray-700 leading-relaxed mt-1">
                  {investorEvaluation.negotiationReasoning}
                </div>
              )}
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Mikrolage</div>
            <div className="text-base text-gray-700 leading-relaxed">
              {investorEvaluation.microLocation}
              {investorEvaluation.microLocationTrend && ` (${investorEvaluation.microLocationTrend})`}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Risiko</div>
            <div className="text-base text-gray-700 leading-relaxed">
              {investorEvaluation.riskLevel}
              {investorEvaluation.riskFactors?.length > 0 &&
                ` (${investorEvaluation.riskFactors.slice(0, 2).join(', ')})`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIEvaluationPanel;
