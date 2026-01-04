'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Sparkles, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { CardProps } from './types';
import { trpc } from '@/lib/trpc';

interface AIAdviceData {
  openai: {
    fazit: string;
    targetPrice: number;
    strategy?: string;
    empfehlung?: string;
  };
  claude: {
    fazit: string;
    targetPrice: number;
    strategy?: string;
    empfehlung?: string;
  };
  baseline?: {
    targetPrice: number;
    reasoning: string;
    discount: number;
  };
  cached: boolean;
  generatedAt: Date;
}

export function VerdictCard({ className = '' }: CardProps) {
  const { props, values, editState, formatCurrency } = useCalculatorContext();
  const [expanded, setExpanded] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<AIAdviceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // tRPC mutation for AI advice - must be called before early return
  const generateAdviceMutation = trpc.evaluations.generateInvestorNegotiationAdvice.useMutation();

  // Only show for investor mode
  if (props.mode !== 'investor') return null;

  const { breakEvenPrice, effectivePurchasePrice, calculatedCashflow } = values;

  // If no break-even price can be calculated, don't show the card
  if (breakEvenPrice === null) return null;

  const diff = breakEvenPrice - effectivePurchasePrice;

  // Determine verdict based on cashflow
  const getVerdict = () => {
    const isPositive = calculatedCashflow > 50;
    const isNeutral = Math.abs(calculatedCashflow) <= 50;

    if (isPositive) {
      return {
        icon: TrendingUp,
        title: 'Cashflow-positiv',
        text: `Das Objekt generiert ${formatCurrency(calculatedCashflow)}/Mo. Max. Kaufpreis für Cashflow = 0: ${formatCurrency(breakEvenPrice)}.`,
        color: 'emerald' as const,
      };
    }

    if (isNeutral) {
      return {
        icon: Scale,
        title: 'Cashflow-neutral',
        text: `Bei einem Kaufpreis von ${formatCurrency(breakEvenPrice)} wäre das Objekt mit den eingestellten Parametern cashflow-neutral.`,
        color: 'amber' as const,
      };
    }

    return {
      icon: TrendingDown,
      title: 'Cashflow-negativ',
      text: `Break-Even bei ${formatCurrency(breakEvenPrice)} (${formatCurrency(Math.abs(diff))} unter aktuellem Preis).`,
      color: 'rose' as const,
    };
  };

  const verdict = getVerdict();
  const Icon = verdict.icon;

  const fetchAIAdvice = async () => {
    setError(null);

    try {
      const result = await generateAdviceMutation.mutateAsync({
        // PropertyId is optional - only provide if available (for saved properties)
        // For manual calculator, it works without propertyId
        propertyId: undefined, // Could be added as optional prop later if needed
        propertyData: {
          title: undefined,
          sqm: Number(props.sqm) || 0,
          location: props.location,
          postalCode: undefined, // Could extract from location if available
          yearBuilt: props.yearBuilt ? Number(props.yearBuilt) : undefined,
        },
        calculatorInputs: {
          kaufpreis: Number(effectivePurchasePrice) || 0,
          miete: Number(editState.monthlyRent || props.monthlyRent) || 0,
          eigenkapital: Number(values.effectiveEquityPercent) || 0,
          tilgung: Number(values.effectiveAmortizationRate) || 0,
          hausgeld: Number(values.hausgeld) || 0,
          cashflow: Number(calculatedCashflow) || 0,
          breakEvenPrice: breakEvenPrice ? Number(breakEvenPrice) : undefined,
          zinssatz: Number(values.effectiveInterestRate) || 0,
        },
      });

      setAiAdvice(result as AIAdviceData);
      setExpanded(true);
    } catch (err) {
      console.error('AI advice error:', err);
      setError(err instanceof Error ? err.message : 'AI-Bewertung fehlgeschlagen');
    }
  };

  const handleButtonClick = () => {
    if (!aiAdvice) {
      // First time: Load AI advice
      fetchAIAdvice();
    } else if (expanded) {
      // Already expanded: Collapse
      setExpanded(false);
    } else {
      // Collapsed: Expand
      setExpanded(true);
    }
  };

  const handleReload = () => {
    // Force reload by clearing state and fetching again
    setAiAdvice(null);
    setExpanded(false);
    fetchAIAdvice();
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    return `vor ${Math.floor(diffHours / 24)} Tag(en)`;
  };

  const calculateSavings = (listingPrice: number, targetPrice: number): string => {
    const savings = listingPrice - targetPrice;
    const savingsPercent = (savings / listingPrice) * 100;
    return `${formatCurrency(savings)} (${savingsPercent.toFixed(1)}%)`;
  };

  // Color mappings
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      title: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-800/50',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      icon: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-800/50',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      icon: 'text-rose-600 dark:text-rose-400',
      title: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-300 dark:border-rose-800/50',
    },
  };

  const styles = colorStyles[verdict.color];

  return (
    <div className={`${styles.bg} border ${styles.border} rounded-xl p-4 ${className}`}>
      {/* Header - always visible */}
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon size={20} className={styles.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-semibold ${styles.title} text-base`}>
                {verdict.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {verdict.text}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {aiAdvice && !generateAdviceMutation.isPending && (
                <button
                  onClick={handleReload}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                  title="Neu laden"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleButtonClick}
                disabled={generateAdviceMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {generateAdviceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analysiere...</span>
                  </>
                ) : expanded && aiAdvice ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span>Einklappen</span>
                  </>
                ) : aiAdvice ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span>Anzeigen</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>AI-Bewertung</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Expanded Area - AI Advice */}
      {expanded && aiAdvice && (
        <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          {/* Negotiation Targets - Prominent Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* OpenAI Target */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-green-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">GPT</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Deal-optimiert</span>
              </div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(aiAdvice.openai.targetPrice)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {calculateSavings(effectivePurchasePrice, aiAdvice.openai.targetPrice)} Ersparnis
              </div>
            </div>

            {/* Claude Target */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded bg-purple-600 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">CL</span>
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Deal-optimiert</span>
              </div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {formatCurrency(aiAdvice.claude.targetPrice)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {calculateSavings(effectivePurchasePrice, aiAdvice.claude.targetPrice)} Ersparnis
              </div>
            </div>
          </div>

          {/* AI Analyses - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAI Analysis */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700 dark:text-green-400">GPT</span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">OpenAI Analyse</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Deal-optimiert</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {aiAdvice.openai.fazit}
              </p>
              {aiAdvice.openai.empfehlung && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Empfehlung:</div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border ${
                    aiAdvice.openai.empfehlung.toUpperCase().includes('KAUFEN') && !aiAdvice.openai.empfehlung.toUpperCase().includes('VERHANDELN')
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                      : aiAdvice.openai.empfehlung.toUpperCase().includes('FINGER WEG')
                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                  }`}>
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span>{aiAdvice.openai.empfehlung}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Claude Analysis */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-400">CL</span>
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">Claude Analyse</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Deal-optimiert</div>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {aiAdvice.claude.fazit}
              </p>
              {aiAdvice.claude.empfehlung && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Empfehlung:</div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border ${
                    aiAdvice.claude.empfehlung.toUpperCase().includes('KAUFEN') && !aiAdvice.claude.empfehlung.toUpperCase().includes('VERHANDELN')
                      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                      : aiAdvice.claude.empfehlung.toUpperCase().includes('FINGER WEG')
                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                  }`}>
                    <Sparkles className="w-4 h-4 flex-shrink-0" />
                    <span>{aiAdvice.claude.empfehlung}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cache Info */}
          {aiAdvice.cached && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Zuletzt aktualisiert: {formatRelativeTime(aiAdvice.generatedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
