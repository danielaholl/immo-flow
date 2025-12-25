'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, TrendingUp, Camera, FileText, Sparkles, ChevronDown } from 'lucide-react';

export interface SellerAnalysisData {
  listing_quality_score: number;
  completeness: {
    score: number;
    missing_fields: string[];
    suggestions: string[];
  };
  photo_quality: {
    score: number;
    photo_count: number;
    recommended_count: number;
    suggestions: string[];
  };
  market_position: {
    price_comparison: 'above_market' | 'market_average' | 'below_market';
    percentage_difference: number;
    market_average_price_per_sqm?: number;
    recommendation: string;
  };
  improvements: string[];
  generated_at: string;
}

interface SellerAnalysisProps {
  analysis: SellerAnalysisData;
  onGenerateAnalysis?: () => void;
  isGenerating?: boolean;
}

// Score von 0-100 auf 1-5 konvertieren
const toDisplayScore = (score: number): number => {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
};

export function SellerAnalysis({ analysis, onGenerateAnalysis, isGenerating }: SellerAnalysisProps) {
  // State for accordions
  const [isCompletenessExpanded, setIsCompletenessExpanded] = useState(false);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState(false);
  const [isPriceExpanded, setIsPriceExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    const displayScore = toDisplayScore(score);
    if (displayScore >= 4) return 'text-green-600';
    if (displayScore === 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    const displayScore = toDisplayScore(score);
    if (displayScore >= 4) return 'bg-green-100';
    if (displayScore === 3) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getPriceComparisonBadge = (comparison: string) => {
    switch (comparison) {
      case 'above_market':
        return { label: 'Über Marktdurchschnitt', bg: 'bg-orange-100', text: 'text-orange-800' };
      case 'market_average':
        return { label: 'Im Marktdurchschnitt', bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'below_market':
        return { label: 'Unter Marktdurchschnitt', bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { label: comparison, bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const priceComparisonBadge = getPriceComparisonBadge(analysis.market_position.price_comparison);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Sparkles className="text-purple-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Verkäufer-Analyse</h3>
            <p className="text-sm text-gray-500">KI-gestützte Optimierungsvorschläge</p>
          </div>
        </div>
        {onGenerateAnalysis && (
          <button
            onClick={onGenerateAnalysis}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {isGenerating ? 'Analysiere...' : 'Neu analysieren'}
          </button>
        )}
      </div>

      {/* Listing Quality Score */}
      <div className={`${getScoreBgColor(analysis.listing_quality_score)} rounded-xl p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">Inseratsqualität</p>
            <p className={`text-3xl font-bold ${getScoreColor(analysis.listing_quality_score)}`}>
              {Math.round(analysis.listing_quality_score)}
            </p>
          </div>
          <div className="text-right">
            {analysis.listing_quality_score >= 60 ? (
              <CheckCircle className="text-green-600" size={32} />
            ) : (
              <AlertCircle className="text-yellow-600" size={32} />
            )}
          </div>
        </div>
      </div>

      {/* Details Accordions - Ausführliche Vorschläge */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Market Position Accordion - ERSTE POSITION */}
        {analysis.market_position.recommendation && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => setIsPriceExpanded(!isPriceExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={20} className="text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-gray-900">Preisempfehlung</h3>
                  <p className="text-sm text-gray-500">
                    Detaillierte Marktanalyse
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isPriceExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isPriceExpanded && (
              <div className="px-6 pb-6 bg-white pt-4">
                <p className="text-sm text-gray-700 leading-relaxed">{analysis.market_position.recommendation}</p>
              </div>
            )}
          </div>
        )}

        {/* Completeness Accordion */}
        {analysis.completeness.suggestions && analysis.completeness.suggestions.length > 0 && (
          <div className="border-b border-gray-200">
            <button
              onClick={() => setIsCompletenessExpanded(!isCompletenessExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText size={20} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-gray-900">Vollständigkeit verbessern</h3>
                  <p className="text-sm text-gray-500">
                    {analysis.completeness.suggestions.length} Vorschläge
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isCompletenessExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isCompletenessExpanded && (
              <div className="px-6 pb-6 space-y-3 bg-white pt-4">
                {analysis.completeness.suggestions.map((suggestion, index) => (
                  <p key={index} className="text-sm text-gray-700 flex items-start gap-2 leading-relaxed">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{suggestion}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Photo Quality Accordion */}
        {analysis.photo_quality.suggestions && analysis.photo_quality.suggestions.length > 0 && (
          <div>
            <button
              onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Camera size={20} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-semibold text-gray-900">Fotos optimieren</h3>
                  <p className="text-sm text-gray-500">
                    {analysis.photo_quality.suggestions.length} Vorschläge
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isPhotoExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {isPhotoExpanded && (
              <div className="px-6 pb-6 space-y-3 bg-white pt-4">
                {analysis.photo_quality.suggestions.map((suggestion, index) => (
                  <p key={index} className="text-sm text-gray-700 flex items-start gap-2 leading-relaxed">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{suggestion}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated At */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Zuletzt aktualisiert: {new Date(analysis.generated_at).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}

// Loading State Component
export function SellerAnalysisSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
          <div>
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Empty State Component
export function SellerAnalysisEmpty({ onGenerate, isGenerating }: { onGenerate: () => void; isGenerating: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Sparkles className="text-purple-600" size={32} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Verkäufer-Analyse erstellen</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Lassen Sie Ihre Immobilie von unserer KI analysieren und erhalten Sie konkrete Verbesserungsvorschläge, um mehr Interessenten zu erreichen.
      </p>
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium inline-flex items-center gap-2"
      >
        <Sparkles size={20} />
        {isGenerating ? 'Analysiere...' : 'Jetzt analysieren'}
      </button>
    </div>
  );
}
