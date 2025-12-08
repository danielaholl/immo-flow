'use client';

import React, { useState } from 'react';
import { Eye, Heart, MessageSquare, TrendingUp, Calendar, Star, ChevronDown, Bot, ArrowRight } from 'lucide-react';

export interface PropertyStatisticsData {
  total_views: number;
  unique_viewers: number;
  favorites_count: number;
  views_last_7_days: number;
  views_last_30_days: number;
  feedback_count: number;
  avg_rating: number | null;
  positive_feedback_count: number;
  neutral_feedback_count: number;
  negative_feedback_count: number;
  // AI Response Stats
  ai_total_questions?: number;
  ai_answered?: number;
  ai_answer_rate?: number;
  ai_forwarded_to_seller?: number;
  // Online Time
  days_online?: number;
}

interface PropertyStatisticsProps {
  stats: PropertyStatisticsData;
  onViewFeedback?: () => void;
}

export function PropertyStatistics({ stats, onViewFeedback }: PropertyStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('de-DE').format(num);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        size={16}
        className={index < Math.round(rating) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
      />
    ));
  };

  // Helper to safely convert avg_rating to number
  const getAvgRating = (): number | null => {
    if (!stats.avg_rating) return null;
    const rating = typeof stats.avg_rating === 'string'
      ? parseFloat(stats.avg_rating)
      : stats.avg_rating;
    return isNaN(rating) ? null : rating;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-gray-900">Inserat-Statistiken</h3>
            <p className="text-sm text-gray-500">
              {formatNumber(stats.total_views)} Aufrufe • {formatNumber(stats.favorites_count)} Favoriten
            </p>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* AI Assistant Statistics - First */}
          {(stats.ai_total_questions !== undefined && stats.ai_total_questions > 0) && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">KI-Assistent</h4>
              <div className="grid grid-cols-2 gap-3">
                {/* AI Answer Rate */}
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Bot size={16} className="text-purple-600" />
                    <span className="text-xs text-gray-600">KI-Abdeckungsrate</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900">{stats.ai_answer_rate}%</p>
                    <span className="text-xs text-gray-500">der Anfragen</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.ai_answered} von {stats.ai_total_questions} beantwortet
                  </p>
                </div>

                {/* Total Questions */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={16} className="text-blue-600" />
                    <span className="text-xs text-gray-600">Gesamt</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.ai_total_questions)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.ai_forwarded_to_seller || 0} weitergeleitet
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Inserat-Statistiken - All in one row */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Inserat-Statistiken</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Total Views */}
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={16} className="text-blue-600" />
                  <span className="text-xs text-gray-600">Gesamt</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total_views)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatNumber(stats.unique_viewers)} unique</p>
              </div>

              {/* Last 7 Days */}
              <div className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-green-600" />
                  <span className="text-xs text-gray-600">Letzte 7 Tage</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.views_last_7_days)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.views_last_30_days} / 30 Tage
                </p>
              </div>

              {/* Favorites */}
              <div className="bg-red-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Heart size={16} className="text-red-600 fill-red-600" />
                  <span className="text-xs text-gray-600">Favoriten</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.favorites_count)}</p>
                {stats.total_views > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {((stats.favorites_count / stats.total_views) * 100).toFixed(1)}% der Besucher
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Feedback */}
          {stats.feedback_count > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Bewertungen</h4>
                {onViewFeedback && (
                  <button
                    onClick={onViewFeedback}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Alle ansehen →
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Average Rating */}
                {getAvgRating() !== null && (
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={16} className="text-yellow-600 fill-yellow-600" />
                      <span className="text-xs text-gray-600">Durchschnitt</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {getAvgRating()!.toFixed(1)}
                      </p>
                      <div className="flex gap-0.5">
                        {renderStars(getAvgRating()!)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatNumber(stats.feedback_count)} Bewertungen
                    </p>
                  </div>
                )}

                {/* Feedback Breakdown */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-green-700">
                      {stats.positive_feedback_count}
                    </div>
                    <div className="text-xs text-gray-600">Positiv</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-blue-700">
                      {stats.neutral_feedback_count}
                    </div>
                    <div className="text-xs text-gray-600">Neutral</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-red-700">
                      {stats.negative_feedback_count}
                    </div>
                    <div className="text-xs text-gray-600">Negativ</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Feedback Message */}
          {stats.feedback_count === 0 && (
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Noch keine Bewertungen vorhanden</p>
              <p className="text-xs text-gray-500 mt-1">
                Sobald Nutzer Ihr Inserat bewerten, erscheinen die Ergebnisse hier
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Loading Skeleton
export function PropertyStatisticsSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
