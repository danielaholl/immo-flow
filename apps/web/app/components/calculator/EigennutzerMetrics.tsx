'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Scale, AlertTriangle, Sparkles, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';
import { trpc } from '@/lib/trpc';

interface AIAdviceData {
  openai: {
    fazit: string;
    recommendation: string;
    reasoning?: string;
  };
  claude: {
    fazit: string;
    recommendation: string;
    reasoning?: string;
  };
  cached: boolean;
  generatedAt: Date;
}

export function EigennutzerMetrics() {
  const params = useParams();
  const propertyId = params.id as string | undefined;

  const { props, values, formatCurrency } = useCalculatorContext();
  const { breakEvenYears, mieteinnahmen, monatlicheRate, hausgeld, instandhaltungskosten } = values;

  const [expanded, setExpanded] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<AIAdviceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // tRPC query for cached AI advice
  const { data: cachedAdvice } = trpc.evaluations.getEigennutzerAdvice.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId }
  );

  // tRPC mutation for AI advice
  const generateAdviceMutation = trpc.evaluations.generateEigennutzerAdvice.useMutation();

  // Load cached advice on mount
  useEffect(() => {
    if (cachedAdvice && !aiAdvice) {
      setAiAdvice(cachedAdvice as AIAdviceData);
      setExpanded(true); // Auto-expand when data is loaded from cache
    }
  }, [cachedAdvice, aiAdvice]);

  // Berechne Kauf/Monat (ohne Tilgung für fairen Vergleich - nur laufende Kosten)
  const kaufProMonat = monatlicheRate + hausgeld + instandhaltungskosten;
  const differenz = mieteinnahmen - kaufProMonat;

  // Feedback basierend auf Break-Even Jahren und Differenz
  const getFeedback = () => {
    if (breakEvenYears === null) {
      return {
        icon: AlertTriangle,
        title: 'Nicht genügend Daten',
        text: 'Bitte füllen Sie alle Felder aus, um eine Empfehlung zu erhalten.',
        color: 'gray' as const,
      };
    }

    if (breakEvenYears <= 10) {
      const ersparnisSatz = differenz > 0
        ? `Kaufen ist ${formatCurrency(differenz)}/Monat günstiger als Mieten. `
        : '';
      return {
        icon: TrendingUp,
        title: 'Kaufen lohnt sich',
        text: `${ersparnisSatz}Nach nur ${breakEvenYears} Jahren haben sich die Kaufnebenkosten amortisiert.`,
        color: 'emerald' as const,
      };
    }

    if (breakEvenYears <= 15) {
      const ersparnisSatz = differenz > 0
        ? `Kaufen ist ${formatCurrency(differenz)}/Monat günstiger als Mieten. `
        : '';
      return {
        icon: TrendingUp,
        title: 'Kaufen ist eine gute Wahl',
        text: `${ersparnisSatz}Die Kaufnebenkosten sind nach ${breakEvenYears} Jahren ausgeglichen.`,
        color: 'emerald' as const,
      };
    }

    if (breakEvenYears <= 25) {
      const ersparnisSatz = differenz > 0
        ? `Kaufen ist ${formatCurrency(differenz)}/Monat günstiger. `
        : differenz < 0
          ? `Mieten ist ${formatCurrency(Math.abs(differenz))}/Monat günstiger. `
          : '';
      return {
        icon: Scale,
        title: 'Kaufen vs. Mieten ausgeglichen',
        text: `${ersparnisSatz}Break-Even nach ${breakEvenYears} Jahren.`,
        color: 'amber' as const,
      };
    }

    if (differenz < 0) {
      const monatlicheMehrkosten = Math.abs(differenz);
      return {
        icon: TrendingDown,
        title: 'Mieten ist günstiger',
        text: `Mieten ist ${formatCurrency(monatlicheMehrkosten)}/Monat günstiger als Kaufen. Break-Even erst nach ${breakEvenYears}+ Jahren.`,
        color: 'rose' as const,
      };
    }

    return {
      icon: TrendingDown,
      title: 'Kaufen dauert sehr lange',
      text: `Bei diesen Konditionen dauert es sehr lange (${breakEvenYears}+ Jahre), bis sich der Kauf lohnt.`,
      color: 'rose' as const,
    };
  };

  const feedback = getFeedback();
  const Icon = feedback.icon;

  const fetchAIAdvice = async () => {
    setError(null);

    // Validate required data
    if (breakEvenYears === null || !mieteinnahmen || !kaufProMonat) {
      setError('Nicht genügend Daten für AI-Bewertung. Bitte füllen Sie alle Felder aus.');
      return;
    }

    try {
      const result = await generateAdviceMutation.mutateAsync({
        propertyId: propertyId, // Use propertyId from params
        propertyData: {
          title: undefined,
          sqm: Number(props.sqm) || 0,
          location: props.location,
          postalCode: undefined,
          yearBuilt: props.yearBuilt ? Number(props.yearBuilt) : undefined,
        },
        calculatorInputs: {
          kaufpreis: Number(values.effectivePurchasePrice) || 0,
          breakEvenYears: breakEvenYears,
          monthlyRentCost: mieteinnahmen,
          monthlyOwnershipCost: kaufProMonat,
          eigenkapital: Number(values.eigenkapital) || 0,
          eigenkapitalPercent: Number(values.effectiveEquityPercent) || 0,
          zinssatz: Number(values.effectiveInterestRate) || 0,
          tilgung: Number(values.effectiveAmortizationRate) || 0,
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
      fetchAIAdvice();
    } else if (expanded) {
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  };

  const handleReload = () => {
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

  // Get recommendation color
  const getRecommendationColor = (rec: string) => {
    const upper = rec.toUpperCase();
    if (upper.includes('KAUFEN')) {
      return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
    }
    if (upper.includes('MIETEN')) {
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
    }
    return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
  };

  // Color mappings (same as VerdictCard)
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
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-800/50',
      icon: 'text-gray-500 dark:text-gray-400',
      title: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-700',
    },
  };

  const styles = colorStyles[feedback.color];

  return (
    <div className="space-y-3">
      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Break-Even</p>
          <p className={`text-xl font-semibold ${
            breakEvenYears !== null && breakEvenYears <= 15
              ? 'text-emerald-600 dark:text-emerald-400'
              : breakEvenYears !== null && breakEvenYears <= 25
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-rose-600 dark:text-rose-400'
          }`}>
            {breakEvenYears !== null ? `${breakEvenYears} J.` : '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Miete/Monat</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatCurrency(mieteinnahmen)}
          </p>
        </div>
        <div className="rounded-xl border p-4 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Kauf/Monat</p>
          <p className={`text-xl font-semibold ${
            kaufProMonat < mieteinnahmen
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatCurrency(kaufProMonat)}
          </p>
        </div>
      </div>

      {/* Verdict Card - same structure as Investor VerdictCard */}
      <div className={`${styles.bg} border ${styles.border} rounded-xl p-4`}>
        {/* Header - always visible */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${styles.bg}`}>
            <Icon size={20} className={styles.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className={`font-semibold ${styles.title} text-base`}>
                  {feedback.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {feedback.text}
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
                    aiAdvice
                      ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {generateAdviceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analysiere...</span>
                    </>
                  ) : aiAdvice ? (
                    expanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">Kaufen vs. Mieten</div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {aiAdvice.openai.fazit}
                </p>
                {aiAdvice.openai.recommendation && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Empfehlung:</div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border ${getRecommendationColor(aiAdvice.openai.recommendation)}`}>
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>{aiAdvice.openai.recommendation}</span>
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
                    <div className="text-xs text-gray-500 dark:text-gray-400">Kaufen vs. Mieten</div>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {aiAdvice.claude.fazit}
                </p>
                {aiAdvice.claude.recommendation && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Empfehlung:</div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm border ${getRecommendationColor(aiAdvice.claude.recommendation)}`}>
                      <Sparkles className="w-4 h-4 flex-shrink-0" />
                      <span>{aiAdvice.claude.recommendation}</span>
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
    </div>
  );
}
