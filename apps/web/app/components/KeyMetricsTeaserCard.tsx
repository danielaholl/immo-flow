'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';

export interface KeyMetricsTeaserCardProps {
  propertyId: string;
  grossYield?: number;
  rentMultiplier?: number;
  monthlyCashflow?: number;
  purchasePrice?: number;
  sqm?: number;
  estimatedRentPerSqm?: number;
  monthlyRent?: number;
  monthlyFee?: number;
  yearBuilt?: number;
  financingTerms?: {
    interestRate?: number;
    amortizationRate?: number;
    loanToValue?: number;
  };
  commissionRate?: number;
  userParams?: {
    purchase_price?: string | number | null;
    monthly_rent?: string | number | null;
    monthly_fee?: string | number | null;
    equity_percentage?: string | number | null;
    interest_rate?: string | number | null;
    amortization_rate?: string | number | null;
    broker_commission?: string | number | null;
    renovation_costs?: string | number | null;
  } | null;
  className?: string;
}

const parseNum = (val: unknown, fallback: number): number => {
  if (val === null || val === undefined || val === '') return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

const parseEKRate = (val: unknown, fallback: number): number => {
  if (val === null || val === undefined || val === '' || val === 0) return fallback;
  const num = Number(val);
  return isNaN(num) || num <= 0 ? fallback : num;
};

export function KeyMetricsTeaserCard({
  propertyId,
  grossYield: externalGrossYield,
  rentMultiplier: externalRentMultiplier,
  monthlyCashflow: externalCashflow,
  purchasePrice,
  sqm,
  estimatedRentPerSqm,
  monthlyRent,
  monthlyFee,
  yearBuilt,
  financingTerms,
  commissionRate,
  userParams,
  className = '',
}: KeyMetricsTeaserCardProps) {
  const { data: taxProfile } = trpc.taxOptimizer.getProfile.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const metrics = useMemo(() => {
    const effectivePurchasePrice = parseNum(userParams?.purchase_price ?? purchasePrice, 0);
    const calculatedRent = estimatedRentPerSqm && sqm
      ? Number(estimatedRentPerSqm) * Number(sqm)
      : monthlyRent;
    const mieteinnahmen = parseNum(userParams?.monthly_rent ?? calculatedRent, 0);

    const defaultEKRate = financingTerms?.loanToValue
      ? (100 - Number(financingTerms.loanToValue))
      : 20;
    const eigenkapitalRate = parseEKRate(userParams?.equity_percentage, defaultEKRate);
    const zinssatz = parseNum(userParams?.interest_rate, parseNum(financingTerms?.interestRate, 3.8));
    const tilgung = parseNum(userParams?.amortization_rate, parseNum(financingTerms?.amortizationRate, 2.0));
    const maklerRate = parseNum(userParams?.broker_commission, parseNum(commissionRate, 0));
    const renovierungskosten = parseNum(userParams?.renovation_costs, 0);

    const calculateHausgeld = (): number => {
      if (monthlyFee && Number(monthlyFee) > 0) return Number(monthlyFee);
      if (sqm) {
        const hausgeldProQm = yearBuilt && Number(yearBuilt) >= 1980 ? 2.50 : 3.50;
        return Number(sqm) * hausgeldProQm;
      }
      return 0;
    };
    const hausgeld = parseNum(userParams?.monthly_fee, calculateHausgeld());

    const kaufnebenkosten = effectivePurchasePrice * 0.10 + renovierungskosten + (effectivePurchasePrice * maklerRate / 100);
    const gesamtinvestition = effectivePurchasePrice + kaufnebenkosten;
    const eigenkapital = gesamtinvestition * (eigenkapitalRate / 100);
    const darlehensbetrag = gesamtinvestition - eigenkapital;

    const monatlicheZinsen = darlehensbetrag * (zinssatz / 100 / 12);
    const monatlicheTilgung = darlehensbetrag * (tilgung / 100 / 12);
    const monatlicheRate = Math.ceil(monatlicheZinsen + monatlicheTilgung);
    const instandhaltungskosten = Math.ceil(effectivePurchasePrice * 0.01 / 12);
    const hausgeldNichtUmlegbar = Math.ceil(hausgeld * 0.30);
    const monatlicheAusgaben = monatlicheRate + hausgeldNichtUmlegbar + instandhaltungskosten;

    const calculatedCashflow = mieteinnahmen - monatlicheAusgaben;
    const monthlyCashflow = externalCashflow ?? (mieteinnahmen > 0 ? calculatedCashflow : undefined);

    const localGrossYield = mieteinnahmen > 0 && effectivePurchasePrice > 0
      ? (mieteinnahmen * 12 / effectivePurchasePrice) * 100
      : undefined;

    const effectiveGrossYield = localGrossYield ?? externalGrossYield;

    let steuereffekt: { monatlich: number } | undefined;
    if (monthlyCashflow !== undefined && effectivePurchasePrice > 0) {
      const getAfaRate = (yb?: number) => {
        if (!yb) return 0.02;
        if (yb >= 2024) return 0.04;
        if (yb < 1925) return 0.025;
        return 0.02;
      };
      const getBuildingRatio = (yb?: number) => (yb && yb >= 2024) ? 0.85 : 0.80;

      const afaRate = getAfaRate(yearBuilt ? Number(yearBuilt) : undefined);
      const buildingRatio = getBuildingRatio(yearBuilt ? Number(yearBuilt) : undefined);
      const afaJaehrlich = effectivePurchasePrice * buildingRatio * afaRate;
      const cashflowJaehrlich = monthlyCashflow * 12;
      const steuerlichesErgebnis = cashflowJaehrlich - afaJaehrlich;
      const grenzsteuersatz = taxProfile?.marginal_tax_rate ? Number(taxProfile.marginal_tax_rate) : 0.42;
      const jaehrlich = steuerlichesErgebnis * grenzsteuersatz;

      steuereffekt = { monatlich: Math.round(jaehrlich / 12) };
    }

    return {
      grossYield: effectiveGrossYield,
      monthlyCashflow,
      steuereffekt,
      eigenkapital,
    };
  }, [
    userParams, purchasePrice, sqm, estimatedRentPerSqm, monthlyRent, monthlyFee,
    yearBuilt, financingTerms, commissionRate, externalGrossYield, externalRentMultiplier,
    externalCashflow, taxProfile
  ]);

  const hasData = metrics.grossYield !== undefined || metrics.monthlyCashflow !== undefined;

  // No data state - Airbnb style
  if (!hasData) {
    return (
      <Link href={`/property/${propertyId}/calculator`} className="block group">
        <div className={`bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg hover:border-gray-300 ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
                <TrendingUp size={24} className="text-white" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  Deal-Insights
                </h4>
                <p className="text-gray-500 text-sm mt-0.5">
                  Investment-Analyse starten
                </p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
              <ArrowRight size={20} className="text-gray-600" />
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Results view - Airbnb style
  return (
    <Link href={`/property/${propertyId}/calculator`} className="block group">
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-300 ${className}`}>
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
                <TrendingUp size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Deal-Insights</h3>
                <p className="text-xs text-gray-500">Für Investoren</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 group-hover:text-rose-600 transition-colors">
              <span className="hidden sm:inline font-medium">Details</span>
              <ArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* Metrics Grid - Airbnb style cards */}
        <div className="px-5 pb-5">
          <div className="grid grid-cols-4 gap-3">
            {/* Rendite */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Rendite</p>
              <p className={`text-lg font-semibold ${
                metrics.grossYield !== undefined && metrics.grossYield >= 4
                  ? 'text-emerald-600'
                  : metrics.grossYield !== undefined && metrics.grossYield >= 2
                    ? 'text-amber-600'
                    : 'text-gray-900'
              }`}>
                {metrics.grossYield !== undefined ? `${metrics.grossYield.toFixed(1)}%` : '—'}
              </p>
            </div>

            {/* Cashflow */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Cashflow</p>
              <p className={`text-lg font-semibold ${
                metrics.monthlyCashflow !== undefined && metrics.monthlyCashflow >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}>
                {metrics.monthlyCashflow !== undefined
                  ? `${metrics.monthlyCashflow >= 0 ? '+' : ''}${metrics.monthlyCashflow.toLocaleString('de-DE')}€`
                  : '—'}
              </p>
            </div>

            {/* Steuereffekt */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Steuer</p>
              <p className={`text-lg font-semibold ${
                metrics.steuereffekt !== undefined && metrics.steuereffekt.monatlich < 0
                  ? 'text-emerald-600'
                  : metrics.steuereffekt !== undefined && metrics.steuereffekt.monatlich > 0
                    ? 'text-rose-600'
                    : 'text-gray-900'
              }`}>
                {metrics.steuereffekt !== undefined
                  ? `${metrics.steuereffekt.monatlich < 0 ? '+' : ''}${Math.abs(metrics.steuereffekt.monatlich).toLocaleString('de-DE')}€`
                  : '—'}
              </p>
            </div>

            {/* Cash on Cash */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">CoC</p>
              <p className={`text-lg font-semibold ${
                metrics.monthlyCashflow !== undefined && metrics.eigenkapital > 0 && metrics.monthlyCashflow >= 0
                  ? 'text-emerald-600'
                  : metrics.monthlyCashflow !== undefined && metrics.eigenkapital > 0
                    ? 'text-rose-600'
                    : 'text-gray-900'
              }`}>
                {metrics.monthlyCashflow !== undefined && metrics.eigenkapital > 0
                  ? `${((metrics.monthlyCashflow * 12 / metrics.eigenkapital) * 100).toFixed(1)}%`
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
