'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Scale, AlertTriangle } from 'lucide-react';
import { useCalculatorContext } from './useCalculatorState';

export function EigennutzerMetrics() {
  const { values, formatCurrency } = useCalculatorContext();
  const { breakEvenYears, mieteinnahmen, monatlicheRate, hausgeld, instandhaltungskosten } = values;

  // Berechne Kauf/Monat (ohne Tilgung für fairen Vergleich - nur laufende Kosten)
  const kaufProMonat = monatlicheRate + hausgeld + instandhaltungskosten;
  const differenz = mieteinnahmen - kaufProMonat;

  // Feedback basierend auf Break-Even Jahren und Differenz
  const getFeedback = () => {
    if (breakEvenYears === null) {
      return {
        icon: AlertTriangle,
        text: 'Nicht genügend Daten für eine Empfehlung.',
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-50 dark:bg-gray-800/50',
      };
    }

    if (breakEvenYears <= 10) {
      const ersparnisSatz = differenz > 0
        ? `Kaufen ist ${formatCurrency(differenz)}/Monat günstiger als Mieten. `
        : '';
      return {
        icon: TrendingUp,
        text: `${ersparnisSatz}Kaufen lohnt sich! Nach nur ${breakEvenYears} Jahren haben sich die Kaufnebenkosten amortisiert.`,
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      };
    }

    if (breakEvenYears <= 15) {
      const ersparnisSatz = differenz > 0
        ? `Kaufen ist ${formatCurrency(differenz)}/Monat günstiger als Mieten. `
        : '';
      return {
        icon: TrendingUp,
        text: `${ersparnisSatz}Kaufen ist eine gute Wahl. Die Kaufnebenkosten sind nach ${breakEvenYears} Jahren ausgeglichen.`,
        color: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
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
        text: `${ersparnisSatz}Kaufen vs. Mieten ist ausgeglichen. Break-Even nach ${breakEvenYears} Jahren.`,
        color: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      };
    }

    if (differenz < 0) {
      const monatlicheMehrkosten = Math.abs(differenz);
      return {
        icon: TrendingDown,
        text: `Mieten ist ${formatCurrency(monatlicheMehrkosten)}/Monat günstiger als Kaufen. Break-Even erst nach ${breakEvenYears}+ Jahren.`,
        color: 'text-rose-700 dark:text-rose-400',
        bgColor: 'bg-rose-50 dark:bg-rose-900/20',
      };
    }

    return {
      icon: TrendingDown,
      text: `Bei diesen Konditionen dauert es sehr lange (${breakEvenYears}+ Jahre), bis sich der Kauf lohnt.`,
      color: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-900/20',
    };
  };

  const feedback = getFeedback();
  const FeedbackIcon = feedback.icon;

  return (
    <div className="space-y-3">
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

      {/* Feedback */}
      <div className={`rounded-xl p-4 ${feedback.bgColor} flex items-center gap-3`}>
        <FeedbackIcon size={20} className={feedback.color} />
        <p className={`text-sm font-medium ${feedback.color}`}>
          {feedback.text}
        </p>
      </div>
    </div>
  );
}
