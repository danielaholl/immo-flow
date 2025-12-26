'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, PiggyBank, Info, Settings } from 'lucide-react';

interface TaxBreakdown {
  annualRent: number;
  annualInterest: number;
  annualAfa: number;
  taxableIncome: number;
}

interface PropertyTaxDetailsProps {
  afaStrategy: string;
  afaRate: number;
  annualTaxEffect: number;
  monthlyTaxEffect: number;
  breakdown: TaxBreakdown;
  marginalTaxRate: number;
  hasTaxProfile?: boolean;
}

const AFA_LABELS: Record<string, string> = {
  altbau: 'Altbau (2,5%)',
  bestand: 'Bestand (2%)',
  neubau: 'Neubau (4%)',
  denkmal: 'Denkmal (9%)',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function PropertyTaxDetails({
  afaStrategy,
  afaRate,
  annualTaxEffect,
  monthlyTaxEffect,
  breakdown,
  marginalTaxRate,
  hasTaxProfile = true,
}: PropertyTaxDetailsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isSaving = annualTaxEffect > 0;
  const effectColor = isSaving ? 'text-green-600' : 'text-red-600';
  const bgGradient = isSaving
    ? 'from-green-50 to-green-100/50'
    : 'from-red-50 to-red-100/50';
  const borderColor = isSaving ? 'border-green-200' : 'border-red-200';

  // Don't render if no tax rate is set (marginalTaxRate = 0)
  if (marginalTaxRate === 0) {
    return null;
  }

  return (
    <div
      className={`bg-gradient-to-r ${bgGradient} rounded-xl border ${borderColor} mt-3`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Collapsed Header */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <PiggyBank size={16} className={effectColor} />
          <span className="text-sm font-medium text-gray-700">Steuer-Effekt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${effectColor}`}>
            {isSaving ? '+' : ''}
            {formatCurrency(monthlyTaxEffect)}/M
          </span>
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Annual Overview */}
          <div className="bg-white rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-500">Jährlicher Steuer-Effekt</span>
              <span className={`font-bold ${effectColor}`}>
                {isSaving ? '+' : ''}
                {formatCurrency(annualTaxEffect)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info size={12} />
              <span>
                AfA: {AFA_LABELS[afaStrategy] || afaStrategy} | Steuersatz:{' '}
                {Math.round(marginalTaxRate * 100)}%
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-lg p-3 space-y-2">
            <div className="text-xs font-medium text-gray-600 mb-2">
              Aufschlüsselung (p.a.)
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Mieteinnahmen</span>
              <span className="text-red-600">+{formatCurrency(breakdown.annualRent)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Zinsen (abzugsfähig)</span>
              <span className="text-green-600">-{formatCurrency(breakdown.annualInterest)}</span>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-gray-500">AfA ({Math.round(afaRate * 100)}%)</span>
              <span className="text-green-600">-{formatCurrency(breakdown.annualAfa)}</span>
            </div>

            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
              <span className="text-xs font-medium text-gray-700">
                {breakdown.taxableIncome < 0 ? 'Steuerlicher Verlust' : 'Steuerpflichtiger Gewinn'}
              </span>
              <span
                className={`text-xs font-bold ${
                  breakdown.taxableIncome < 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(Math.abs(breakdown.taxableIncome))}
              </span>
            </div>
          </div>

          {/* Tax Profile Hint */}
          {!hasTaxProfile && (
            <Link
              href="/steuer-optimierer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2 hover:bg-amber-100 transition-colors"
            >
              <Settings size={14} className="text-amber-600" />
              <span className="text-xs text-amber-700">
                Steuersatz anpassen im Steuer-Optimierer (aktuell: 42% Standard)
              </span>
            </Link>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 text-center">
            Vereinfachte Berechnung. Keine Steuerberatung.
          </p>
        </div>
      )}
    </div>
  );
}
