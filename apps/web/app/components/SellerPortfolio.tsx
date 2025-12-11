'use client';

import { TrendingUp, Home, MessageSquare, Bot, Heart, Eye } from 'lucide-react';

export interface SellerPortfolioStats {
  activeProperties: number;
  totalContacts: number;
  totalMessages: number;
  aiAnswerRate: number;
  aiHandledCount: number;
  totalConversations: number;
  totalFavorites: number;
  totalViews: number;
}

interface SellerPortfolioProps {
  stats: SellerPortfolioStats;
}

export function SellerPortfolio({ stats }: SellerPortfolioProps) {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  return (
    <>
      {/* Stats Grid - All in one row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {/* Active Properties */}
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Home size={14} className="text-blue-600" />
            <span className="text-xs text-gray-600">Inserate</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.activeProperties)}</p>
        </div>

        {/* Total Contacts */}
        <div className="bg-green-50 rounded-lg p-2 border border-green-200">
          <div className="flex items-center gap-1 mb-0.5">
            <MessageSquare size={14} className="text-green-600" />
            <span className="text-xs text-gray-600">Kontakte</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalContacts)}</p>
        </div>

        {/* AI Answer Rate */}
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Bot size={14} className="text-purple-600" />
            <span className="text-xs text-gray-600">KI-Rate</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.aiAnswerRate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatNumber(stats.aiHandledCount)} / {formatNumber(stats.totalConversations)} Anfragen
          </p>
        </div>

        {/* Total Messages */}
        <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
          <div className="flex items-center gap-1 mb-0.5">
            <MessageSquare size={14} className="text-orange-600" />
            <span className="text-xs text-gray-600">Messages</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalMessages)}</p>
        </div>

        {/* Total Favorites */}
        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Heart size={14} className="text-red-600" />
            <span className="text-xs text-gray-600">Favoriten</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalFavorites)}</p>
        </div>

        {/* Total Views */}
        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
          <div className="flex items-center gap-1 mb-0.5">
            <Eye size={14} className="text-gray-600" />
            <span className="text-xs text-gray-600">Aufrufe</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalViews)}</p>
        </div>
      </div>

      {/* Empty State */}
      {stats.activeProperties === 0 && stats.totalContacts === 0 && (
        <div className="mt-4 p-6 text-center bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-700 font-medium mb-1">Noch keine Aktivität</p>
          <p className="text-sm text-gray-500">
            Erstellen Sie Ihr erstes Inserat um Statistiken zu sehen
          </p>
        </div>
      )}
    </>
  );
}

// Loading Skeleton
export function SellerPortfolioSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg border border-gray-200" />
      ))}
    </div>
  );
}
