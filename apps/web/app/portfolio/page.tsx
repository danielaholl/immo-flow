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
import { PortfolioDistribution } from './components/PortfolioDistribution';
import { Plus, Lock, TrendingUp } from 'lucide-react';

export default function PortfolioPage() {
  const router = useRouter();
  const { canAccess, plan, isLoading: subscriptionLoading } = useSubscription();

  const { data: properties, isLoading: propertiesLoading } = trpc.portfolio.getAll.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.portfolio.getSummary.useQuery();
  const { data: propertyCount } = trpc.portfolio.getPropertyCount.useQuery();
  const { data: taxEffectsData } = trpc.portfolio.getTaxEffects.useQuery();

  const isLoading = propertiesLoading || summaryLoading || subscriptionLoading;
  const hasProperties = properties && properties.length > 0;
  const canAddMore = propertyCount?.isPro || (propertyCount?.count ?? 0) < 3;
  const canAccessAnalytics = canAccess('portfolio_analytics');
  const canAccessCharts = canAccess('portfolio_charts');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#030712]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Mein Portfolio
          </h1>
        </div>

        {!hasProperties ? (
          <PortfolioEmptyState onAddProperty={() => router.push('/portfolio/add')} />
        ) : (
          <div className="space-y-8">
            {/* Hero Stats */}
            <PortfolioHeroStats
              summary={summary}
              canAccessAnalytics={canAccessAnalytics}
              properties={properties}
              taxEffectsData={taxEffectsData}
            />

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio-Entwicklung (Pro only) */}
              {canAccessCharts ? (
                <PortfolioCharts summary={summary} />
              ) : (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/50 p-6 h-full">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-800/50 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        Portfolio-Entwicklung
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Visualisiere deine Wertentwicklung mit interaktiven Charts.
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

              {/* Portfolio-Verteilung (für alle User) */}
              <PortfolioDistribution />
            </div>

            {/* Property List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Meine Objekte
                </h2>
                <button
                  onClick={() => router.push('/portfolio/add')}
                  disabled={!canAddMore}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                    canAddMore
                      ? 'bg-[#FF385C] text-white hover:bg-[#E31C5F] shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canAddMore ? (
                    <>
                      <Plus size={18} />
                      Objekt hinzufügen
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      Limit erreicht (3/3)
                    </>
                  )}
                </button>
              </div>
              <PortfolioPropertyList
                properties={properties}
                canAccessAnalytics={canAccessAnalytics}
                taxEffects={taxEffectsData?.taxEffects}
                marginalTaxRate={taxEffectsData?.marginalTaxRate}
              />
            </div>

            {/* Upgrade CTA for non-Pro users */}
            {!propertyCount?.isPro && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Mehr als 3 Immobilien?
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
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
