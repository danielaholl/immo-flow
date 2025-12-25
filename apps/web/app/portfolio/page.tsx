'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../lib/trpc';
import { useSubscription } from '../../hooks/useSubscription';
import { Header } from '../components/Header';
import { PortfolioHeroStats } from './components/PortfolioHeroStats';
import { PortfolioPropertyList } from './components/PortfolioPropertyList';
import { PortfolioEmptyState } from './components/PortfolioEmptyState';
import { PortfolioCharts } from './components/PortfolioCharts';
import { PortfolioTreemap } from './components/PortfolioTreemap';
import { Plus, Lock, TrendingUp } from 'lucide-react';

export default function PortfolioPage() {
  const router = useRouter();
  const { canAccess, plan, isLoading: subscriptionLoading } = useSubscription();

  const { data: properties, isLoading: propertiesLoading } = trpc.portfolio.getAll.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.portfolio.getSummary.useQuery();
  const { data: propertyCount } = trpc.portfolio.getPropertyCount.useQuery();

  const isLoading = propertiesLoading || summaryLoading || subscriptionLoading;
  const hasProperties = properties && properties.length > 0;
  const canAddMore = propertyCount?.isPro || (propertyCount?.count ?? 0) < 3;
  const canAccessAnalytics = canAccess('portfolio_analytics');
  const canAccessCharts = canAccess('portfolio_charts');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Mein Portfolio
            </h1>
            {hasProperties && summary ? (
              (() => {
                const totalValue = summary.totalValue || 0;
                const totalInvestment = summary.totalInvestment || 0;
                const valueChange = totalValue - totalInvestment;
                const changePercent = totalInvestment > 0
                  ? ((valueChange / totalInvestment) * 100).toFixed(1)
                  : '0.0';
                const isPositive = valueChange > 0;
                const isNegative = valueChange < 0;
                const colorClass = isPositive
                  ? 'text-green-500'
                  : isNegative
                    ? 'text-red-500'
                    : 'text-gray-400';

                return (
                  <div className="mt-2">
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(totalValue)}
                    </p>
                    <p className={`text-sm font-medium ${colorClass} mt-1`}>
                      {isPositive ? '+' : ''}{new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(valueChange)} ({isPositive ? '+' : ''}{changePercent}%) vs. GIK
                    </p>
                  </div>
                );
              })()
            ) : (
              <p className="text-gray-500 mt-1">
                Verwalte deine Immobilien-Investments
              </p>
            )}
          </div>

          {hasProperties && (
            <button
              onClick={() => router.push('/portfolio/add')}
              disabled={!canAddMore}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all ${
                canAddMore
                  ? 'bg-[#FF385C] text-white hover:bg-[#E31C5F] shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canAddMore ? (
                <>
                  <Plus size={20} />
                  Immobilie hinzufügen
                </>
              ) : (
                <>
                  <Lock size={18} />
                  Limit erreicht (3/3)
                </>
              )}
            </button>
          )}
        </div>

        {!hasProperties ? (
          <PortfolioEmptyState onAddProperty={() => router.push('/portfolio/add')} />
        ) : (
          <div className="space-y-8">
            {/* Treemap Visualization */}
            <PortfolioTreemap properties={properties} />

            {/* Hero Stats */}
            <PortfolioHeroStats summary={summary} canAccessAnalytics={canAccessAnalytics} />

            {/* Charts Section (Pro only) */}
            {canAccessCharts ? (
              <PortfolioCharts summary={summary} />
            ) : (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Portfolio-Analyse & Charts
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Visualisiere deine Wertentwicklung, Cashflow-Trends und mehr mit interaktiven Charts.
                    </p>
                    <button
                      onClick={() => router.push('/pricing')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                    >
                      <Lock size={16} />
                      Upgrade auf Pro
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Property List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Deine Immobilien
              </h2>
              <PortfolioPropertyList
                properties={properties}
                canAccessAnalytics={canAccessAnalytics}
              />
            </div>

            {/* Upgrade CTA for non-Pro users */}
            {!propertyCount?.isPro && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Mehr als 3 Immobilien?
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Upgrade auf Pro für unbegrenzte Immobilien, detaillierte Analysen und Export-Funktionen.
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/pricing')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                  >
                    Upgrade auf Pro
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
