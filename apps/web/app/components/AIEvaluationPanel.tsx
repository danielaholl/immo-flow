'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Home, TrendingUp, Euro, Target, AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react';

// Types for evaluations
export interface SellerEvaluation {
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
}

export interface BuyerEvaluation {
  buyer_selfuse?: BuyerSelfuseEvaluation;
  buyer_investor?: BuyerInvestorEvaluation;
}

export interface AIEvaluationPanelProps {
  mode: 'buyer' | 'seller';
  propertyId?: string; // Optional - may not exist in create mode
  // Existing evaluation data
  sellerEvaluation?: SellerEvaluation;
  buyerEvaluation?: BuyerEvaluation;
  // Loading state (controlled externally)
  isLoading?: boolean;
  // Callback to trigger evaluation
  onTriggerEvaluation: (viewType: 'seller' | 'buyer_selfuse' | 'buyer_investor') => void;
  // Optional: callback when evaluation is updated
  onEvaluationUpdated?: () => void;
  // Custom class name
  className?: string;
}

export function AIEvaluationPanel({
  mode,
  // propertyId is passed for reference but not used internally - evaluation is triggered by parent
  sellerEvaluation,
  buyerEvaluation,
  isLoading = false,
  onTriggerEvaluation,
  // onEvaluationUpdated can be used by parent if needed
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

  // Get color indicator based on mode and score
  // Offizielle Schwellenwerte: >= 70 (Exzellent), >= 40 (Moderat), < 40 (Risiko)
  const getColorIndicator = () => {
    if (mode === 'buyer' && buyerEvaluation?.buyer_investor) {
      const score = buyerEvaluation.buyer_investor.investmentScore;
      let color = '#EF4444'; // red
      let label = 'Risiko';

      if (score >= 70) {
        color = '#22C55E'; // green
        label = 'Exzellent';
      } else if (score >= 40) {
        color = '#EAB308'; // yellow
        label = 'Moderat';
      }

      return { color, label };
    }

    if (mode === 'seller' && sellerEvaluation) {
      // For seller mode, use price assessment to determine color
      const assessment = sellerEvaluation.priceAssessment?.toLowerCase() || '';
      let color = '#22C55E'; // green (default: fair price)
      let label = 'Gut';

      if (assessment.includes('unter') || assessment.includes('günstig')) {
        color = '#22C55E'; // green
        label = 'Attraktiv';
      } else if (assessment.includes('über') || assessment.includes('hoch')) {
        color = '#EF4444'; // red
        label = 'Prüfen';
      } else if (assessment.includes('fair') || assessment.includes('markt')) {
        color = '#EAB308'; // yellow
        label = 'Fair';
      }

      return { color, label };
    }

    return null;
  };

  const colorIndicator = getColorIndicator();

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
        className="w-full p-4 sm:p-5 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={18} className={`flex-shrink-0 ${mode === 'seller' ? 'text-emerald-600' : 'text-purple-600'}`} />
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
              AI-Score
            </h3>
            {/* Ampel-Anzeige für Buyer Mode */}
            {colorIndicator && (
              <div className="flex items-center gap-1.5 ml-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: colorIndicator.color }}
                />
                <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                  {colorIndicator.label}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Neu bewerten Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRefreshEvaluation();
              }}
              className={`p-2 rounded-lg transition-colors ${mode === 'seller' ? 'hover:bg-emerald-100 text-emerald-600' : 'hover:bg-purple-100 text-purple-600'}`}
              title="Bewertung neu generieren"
            >
              <RefreshCw size={16} />
            </button>
            <ChevronDown
              size={20}
              className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Key Metrics Preview - shown when collapsed */}
        {!isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Seller Mode Metrics */}
            {mode === 'seller' && sellerEvaluation && (
              <>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Marktwert</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(sellerEvaluation.recommendedPrice)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Preis</div>
                  <div className="text-sm font-semibold text-gray-900">{sellerEvaluation.priceAssessment}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Dauer</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {sellerEvaluation.marketingDurationMin}-{sellerEvaluation.marketingDurationMax} Wo.
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Vergleiche</div>
                  <div className="text-sm font-semibold text-gray-900">{sellerEvaluation.comparableSales}</div>
                </div>
              </>
            )}

            {/* Buyer Investor Mode Metrics */}
            {mode === 'buyer' && buyerEvaluation?.buyer_investor && (
              <>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Score</div>
                  <div className="text-sm font-semibold text-gray-900">{buyerEvaluation.buyer_investor.investmentScore}/100</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Rendite</div>
                  <div className="text-sm font-semibold text-gray-900">
                    {buyerEvaluation.buyer_investor.grossYield?.toFixed(1) || '—'}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Cashflow</div>
                  <div className={`text-sm font-semibold ${(buyerEvaluation.buyer_investor.monthlyBudget || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(buyerEvaluation.buyer_investor.monthlyBudget || 0) >= 0 ? '+' : ''}
                    {(buyerEvaluation.buyer_investor.monthlyBudget || 0).toLocaleString('de-DE')}€
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 mb-0.5">Risiko</div>
                  <div className={`text-sm font-semibold ${
                    buyerEvaluation.buyer_investor.riskLevel === 'niedrig' ? 'text-green-600' :
                    buyerEvaluation.buyer_investor.riskLevel === 'mittel' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {buyerEvaluation.buyer_investor.riskLevel}
                  </div>
                </div>
              </>
            )}
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
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-4">
      {/* Market Value */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Euro size={16} className="text-green-600" />
          <h4 className="text-sm font-medium text-gray-700">Marktwertanalyse</h4>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between">
            <span className="text-gray-600">Geschätzter Marktwert:</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(evaluation.marketValueMin)} - {formatPrice(evaluation.marketValueMax)}
            </span>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600">Empfohlener Preis:</span>
            <span className="font-semibold text-green-600">{formatPrice(evaluation.recommendedPrice)}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600">Preiseinschätzung:</span>
            <span className="font-semibold text-gray-900">{evaluation.priceAssessment}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-gray-600">Vergleichbare Verkäufe:</span>
            <span className="font-semibold text-gray-900">{evaluation.comparableSales} in der Region</span>
          </li>
        </ul>
      </div>

      {/* Marketing Duration */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-blue-600" />
          <h4 className="text-sm font-medium text-gray-700">Vermarktung</h4>
        </div>
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between">
            <span className="text-gray-600">Erwartete Vermarktungsdauer:</span>
            <span className="font-semibold text-gray-900">
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
          <ul className="space-y-1 text-sm">
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
          <ul className="space-y-1 text-sm">
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
          <p className="text-sm text-gray-600 italic">{evaluation.summary}</p>
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
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-600">Wohn-Score:</span>
              <span className="font-semibold text-gray-900">{selfuseEvaluation.livingScore}/100</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Lagequalität:</span>
              <span className="font-semibold text-gray-900">{selfuseEvaluation.locationQuality}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Einkaufsmöglichkeiten:</span>
              <span className="font-semibold text-gray-900">{selfuseEvaluation.shoppingFacilities}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Kaufen vs. Mieten:</span>
              <span className="font-semibold text-gray-900">
                {selfuseEvaluation.buyVsRentYears} Jahre ({selfuseEvaluation.buyVsRentAssessment})
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Lärmpegel:</span>
              <span className="font-semibold text-gray-900">{selfuseEvaluation.noiseLevel}</span>
            </li>
          </ul>
        </div>
      )}

      {/* Separator if both exist */}
      {selfuseEvaluation && investorEvaluation && <div className="border-t border-gray-200" />}

      {/* Investment-Score (Investor) */}
      {investorEvaluation && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-purple-600" />
            <h4 className="text-sm font-medium text-gray-700">Investment-Score</h4>
          </div>
          <ul className="space-y-1.5 text-sm">
            <li className="flex justify-between">
              <span className="text-gray-600">Investment-Score:</span>
              <span className="font-semibold text-gray-900">{investorEvaluation.investmentScore}/100</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Bruttorendite:</span>
              <span className="font-semibold text-gray-900">{investorEvaluation.grossYield?.toFixed(1) || '—'}%</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Cashflow (nach Finanzierung):</span>
              <span
                className={`font-semibold ${(investorEvaluation.monthlyBudget || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {(investorEvaluation.monthlyBudget || 0) >= 0 ? '+' : ''}
                {(investorEvaluation.monthlyBudget || 0).toLocaleString('de-DE')}€/Monat
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Mietmultiplikator:</span>
              <span className="font-semibold text-gray-900">{investorEvaluation.rentMultiplier?.toFixed(1) || '—'}x</span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Mikrolage:</span>
              <span className="font-semibold text-gray-900">
                {investorEvaluation.microLocation}
                {investorEvaluation.microLocationTrend && ` (${investorEvaluation.microLocationTrend})`}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-gray-600">Risiko:</span>
              <span
                className={`font-semibold ${
                  investorEvaluation.riskLevel === 'niedrig'
                    ? 'text-green-600'
                    : investorEvaluation.riskLevel === 'mittel'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {investorEvaluation.riskLevel}
                {investorEvaluation.riskFactors?.length > 0 &&
                  ` (${investorEvaluation.riskFactors.slice(0, 2).join(', ')})`}
              </span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default AIEvaluationPanel;
