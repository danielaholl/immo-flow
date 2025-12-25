'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Clock, Users, TrendingDown, Calculator } from 'lucide-react';

interface MarketComparisonBarProps {
  deviationPercent: number;
  pricePosition: 'sehr_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'sehr_teuer';
  currentPricePerSqm: number;
  marketAvgPricePerSqm: number;
  minPricePerSqm?: number | null;
  maxPricePerSqm?: number | null;
  sqm?: number;
  rooms?: number;
  location?: string;
  onPriceChange?: (newPrice: number, newPricePerSqm: number) => void;
  isInteractive?: boolean;
  className?: string;
  // Props for buyer views
  viewType?: 'seller' | 'buyer_selfuse' | 'buyer_investor';
  // API data (replaces client-side calculations)
  marketingDurationMin?: number;
  marketingDurationMax?: number;
  aiScore?: number | null;
}

export function MarketComparisonBar({
  deviationPercent: initialDeviationPercent,
  pricePosition: initialPricePosition,
  currentPricePerSqm: initialPricePerSqm,
  marketAvgPricePerSqm,
  minPricePerSqm,
  maxPricePerSqm,
  sqm = 0,
  rooms = 0,
  location = '',
  onPriceChange,
  isInteractive = true,
  className = '',
  viewType = 'seller',
  marketingDurationMin: apiMarketingMin,
  marketingDurationMax: apiMarketingMax,
  aiScore,
}: MarketComparisonBarProps) {
  // State for interactive slider
  const [isDragging, setIsDragging] = useState(false);
  const [localDeviationPercent, setLocalDeviationPercent] = useState(initialDeviationPercent);
  const barRef = useRef<HTMLDivElement>(null);

  // Update local state when props change
  useEffect(() => {
    if (!isDragging) {
      setLocalDeviationPercent(initialDeviationPercent);
    }
  }, [initialDeviationPercent, isDragging]);

  // Calculate current values based on deviation
  const deviationPercent = localDeviationPercent;
  const currentPricePerSqm = Math.round(marketAvgPricePerSqm * (1 + deviationPercent / 100));
  const currentPrice = sqm > 0 ? currentPricePerSqm * sqm : 0;

  // Calculate marker position (0-100%)
  // Center (50%) = market average
  // Clamp between 5% and 95%
  const markerPosition = Math.min(95, Math.max(5, 50 + deviationPercent));

  // Get current price position
  const getPricePosition = (deviation: number): typeof initialPricePosition => {
    if (deviation <= -15) return 'sehr_guenstig';
    if (deviation <= -5) return 'guenstig';
    if (deviation <= 5) return 'marktgerecht';
    if (deviation <= 15) return 'teuer';
    return 'sehr_teuer';
  };

  const pricePosition = getPricePosition(deviationPercent);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get position label
  const getPositionLabel = () => {
    switch (pricePosition) {
      case 'sehr_guenstig':
        return 'Sehr günstig';
      case 'guenstig':
        return 'Günstig';
      case 'marktgerecht':
        return 'Marktgerecht';
      case 'teuer':
        return 'Über Markt';
      case 'sehr_teuer':
        return 'Deutlich über Markt';
    }
  };

  // Get glow color based on price position
  const getGlowColor = () => {
    switch (pricePosition) {
      case 'sehr_guenstig':
      case 'guenstig':
        return 'rgba(34, 197, 94, 0.6)'; // green-500
      case 'marktgerecht':
        return 'rgba(250, 204, 21, 0.6)'; // yellow-400
      case 'teuer':
      case 'sehr_teuer':
        return 'rgba(239, 68, 68, 0.6)'; // red-500
    }
  };

  // Get color for the position badge based on position
  const getPositionColor = () => {
    if (deviationPercent <= -10) return '#22C55E'; // Green
    if (deviationPercent <= 0) return '#84CC16'; // Light green
    if (deviationPercent <= 10) return '#F59E0B'; // Yellow/Orange
    if (deviationPercent <= 20) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Get marketing duration from API or calculate estimate
  const getMarketingDuration = () => {
    // Use API data if available
    const min = apiMarketingMin ?? (deviationPercent <= -10 ? 2 : deviationPercent <= 0 ? 3 : deviationPercent <= 10 ? 4 : deviationPercent <= 20 ? 8 : 16);
    const max = apiMarketingMax ?? (deviationPercent <= -10 ? 4 : deviationPercent <= 0 ? 6 : deviationPercent <= 10 ? 8 : deviationPercent <= 20 ? 16 : 24);

    // Determine label based on duration
    let label: string;
    if (max <= 4) label = 'Sehr schnell';
    else if (max <= 6) label = 'Schnell';
    else if (max <= 10) label = 'Normal';
    else if (max <= 16) label = 'Länger';
    else label = 'Sehr lang';

    return { min, max, label };
  };

  // Get AI-Score color and label
  const getAiScoreDisplay = () => {
    if (!aiScore) return null;
    if (aiScore >= 80) return { color: '#22C55E', label: 'Top' };
    if (aiScore >= 60) return { color: '#84CC16', label: 'Gut' };
    if (aiScore >= 40) return { color: '#EAB308', label: 'OK' };
    if (aiScore >= 20) return { color: '#F97316', label: 'Schwach' };
    return { color: '#EF4444', label: 'Nein' };
  };

  const aiScoreDisplay = getAiScoreDisplay();

  // Calculate search queries based on price position
  // Lower price = more search queries matching
  const getSearchQueries = () => {
    // Base queries depend on location popularity and rooms
    const baseQueries = 150 + (rooms * 20); // More rooms = slightly more searches

    // Adjust based on price deviation
    // Under market = many more matches, over market = fewer matches
    if (deviationPercent <= -20) {
      return { count: Math.round(baseQueries * 2.5), trend: 'sehr_hoch' as const };
    } else if (deviationPercent <= -10) {
      return { count: Math.round(baseQueries * 2.0), trend: 'hoch' as const };
    } else if (deviationPercent <= 0) {
      return { count: Math.round(baseQueries * 1.5), trend: 'gut' as const };
    } else if (deviationPercent <= 10) {
      return { count: Math.round(baseQueries * 1.0), trend: 'normal' as const };
    } else if (deviationPercent <= 20) {
      return { count: Math.round(baseQueries * 0.5), trend: 'niedrig' as const };
    } else {
      return { count: Math.round(baseQueries * 0.2), trend: 'sehr_niedrig' as const };
    }
  };

  const getSearchTrendLabel = (trend: string) => {
    switch (trend) {
      case 'sehr_hoch': return 'Sehr hoch';
      case 'hoch': return 'Hoch';
      case 'gut': return 'Gut';
      case 'normal': return 'Normal';
      case 'niedrig': return 'Niedrig';
      case 'sehr_niedrig': return 'Sehr niedrig';
      default: return 'Normal';
    }
  };

  const getSearchTrendColor = (trend: string) => {
    switch (trend) {
      case 'sehr_hoch': return '#22C55E';
      case 'hoch': return '#84CC16';
      case 'gut': return '#84CC16';
      case 'normal': return '#F59E0B';
      case 'niedrig': return '#F97316';
      case 'sehr_niedrig': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const marketingDuration = getMarketingDuration();
  const searchQueries = getSearchQueries();

  // Buyer-specific: Get recommendation text based on price position
  const getBuyerRecommendation = () => {
    const absDeviation = Math.abs(deviationPercent);
    if (deviationPercent <= -15) {
      return {
        text: `Schnäppchen! Vergleichbare Objekte in ${location || 'dieser Lage'} kosten ${absDeviation}% mehr.`,
        color: '#22C55E',
        sentiment: 'positive',
      };
    }
    if (deviationPercent <= -5) {
      return {
        text: `Gutes Preis-Leistungs-Verhältnis. ${absDeviation}% unter dem Marktdurchschnitt.`,
        color: '#84CC16',
        sentiment: 'positive',
      };
    }
    if (deviationPercent <= 5) {
      return {
        text: 'Fairer Preis. Entspricht dem lokalen Marktdurchschnitt.',
        color: '#3B82F6',
        sentiment: 'neutral',
      };
    }
    if (deviationPercent <= 15) {
      return {
        text: `Über Markt. Verhandlungsspielraum von ca. ${absDeviation}%.`,
        color: '#F97316',
        sentiment: 'negotiation',
      };
    }
    return {
      text: `Deutlich über Markt (+${absDeviation}%). Starke Verhandlungsposition.`,
      color: '#EF4444',
      sentiment: 'negotiation',
    };
  };

  // Buyer-specific: Calculate negotiation price
  const getNegotiationPrice = () => {
    if (deviationPercent <= 5) return null; // No negotiation needed
    const fairPrice = Math.round(marketAvgPricePerSqm * sqm);
    const suggestedOffer = Math.round(fairPrice * 1.03); // 3% above market
    const potentialSavings = currentPrice - suggestedOffer;
    return {
      fairPrice,
      suggestedOffer,
      potentialSavings,
    };
  };

  const buyerRecommendation = getBuyerRecommendation();
  const negotiationPrice = getNegotiationPrice();

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isInteractive) return;
    e.preventDefault();
    setIsDragging(true);
  }, [isInteractive]);

  // Handle drag move
  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging || !barRef.current) return;

    const rect = barRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = (x / rect.width) * 100;

    // Convert position to deviation (-45% to +45% range)
    // 0% position = -45% deviation, 50% = 0%, 100% = +45%
    const newDeviation = Math.round((percentage - 50) * 0.9);
    const clampedDeviation = Math.max(-45, Math.min(45, newDeviation));

    setLocalDeviationPercent(clampedDeviation);

    // Notify parent of price change
    if (onPriceChange && sqm > 0) {
      const newPricePerSqm = Math.round(marketAvgPricePerSqm * (1 + clampedDeviation / 100));
      const newPrice = newPricePerSqm * sqm;
      onPriceChange(newPrice, newPricePerSqm);
    }
  }, [isDragging, marketAvgPricePerSqm, sqm, onPriceChange]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch event handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX);
      }
    };

    const handleTouchEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div className={`w-full ${className}`}>
      {/* Price Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-4">
          {/* Kaufpreis */}
          {sqm > 0 && (
            <div>
              <span className="text-2xl font-bold text-gray-900">{formatPrice(currentPrice)}</span>
            </div>
          )}
          {/* Preis/m² */}
          <div className="text-gray-500">
            <span className="text-lg font-semibold">{formatPrice(currentPricePerSqm)}</span>
            <span className="text-sm ml-1">/m²</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI-Score Badge */}
          {aiScoreDisplay && (
            <span
              className="text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{
                backgroundColor: aiScoreDisplay.color + '20',
                color: aiScoreDisplay.color,
              }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              {aiScore}
            </span>
          )}
          {/* Position Badge */}
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              backgroundColor: getPositionColor() + '20',
              color: getPositionColor(),
            }}
          >
            {getPositionLabel()}
          </span>
        </div>
      </div>

      {/* Gradient Bar with Marker */}
      <div
        ref={barRef}
        className={`relative h-10 rounded-full overflow-visible bg-gradient-to-r from-green-500 via-yellow-400 to-red-500 ${
          isInteractive ? 'cursor-pointer' : ''
        }`}
        onClick={(e) => {
          if (!isInteractive || isDragging) return;
          const rect = barRef.current?.getBoundingClientRect();
          if (rect) {
            const x = e.clientX - rect.left;
            const percentage = (x / rect.width) * 100;
            const newDeviation = Math.round((percentage - 50) * 0.9);
            const clampedDeviation = Math.max(-45, Math.min(45, newDeviation));
            setLocalDeviationPercent(clampedDeviation);

            if (onPriceChange && sqm > 0) {
              const newPricePerSqm = Math.round(marketAvgPricePerSqm * (1 + clampedDeviation / 100));
              const newPrice = newPricePerSqm * sqm;
              onPriceChange(newPrice, newPricePerSqm);
            }
          }
        }}
      >
        {/* Market Average Line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white opacity-80"
          style={{ left: '50%' }}
        />

        {/* Current Price Marker - White Circle with colored glow */}
        <div
          className={`absolute top-1/2 w-7 h-7 rounded-full bg-white border-4 border-white transition-shadow ${
            isInteractive ? 'cursor-grab active:cursor-grabbing hover:scale-110' : ''
          } ${isDragging ? 'scale-110' : ''}`}
          style={{
            left: `${markerPosition}%`,
            transform: `translateX(-50%) translateY(-50%)`,
            boxShadow: isDragging
              ? `0 0 0 3px ${getGlowColor()}, 0 4px 12px rgba(0,0,0,0.3)`
              : `0 0 0 2px ${getGlowColor()}, 0 2px 8px rgba(0,0,0,0.25)`,
            animation: isInteractive && !isDragging ? 'wiggle 1.5s ease-in-out infinite' : 'none',
          }}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Günstig</span>
        <span className="font-medium text-gray-700">Markt ({formatPrice(marketAvgPricePerSqm)}/m²)</span>
        <span>Teuer</span>
      </div>

      {/* Wiggle animation for interactive marker */}
      {isInteractive && (
        <style>{`
          @keyframes wiggle {
            0%, 100% { transform: translateX(-50%) translateY(-50%); }
            50% { transform: translateX(-50%) translateY(-50%) scale(1.1); }
          }
        `}</style>
      )}

      {/* Buyer View: Recommendation & Negotiation - moved up */}
      {(viewType === 'buyer_selfuse' || viewType === 'buyer_investor') && (
        <div className="mt-4 space-y-3">
          {/* Buyer Recommendation Text */}
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: buyerRecommendation.color + '15' }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: buyerRecommendation.color }}
            >
              {buyerRecommendation.text}
            </p>
          </div>

          {/* Negotiation Price - Only when above market */}
          {negotiationPrice && (
            <div className="bg-gradient-to-r from-amber-50/40 to-orange-50/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <TrendingDown size={16} className="text-amber-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Verhandlungsempfehlung</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Empfohlenes Angebot</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(negotiationPrice.suggestedOffer)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mögliche Ersparnis</p>
                  <p className="text-lg font-bold text-green-600">{formatPrice(negotiationPrice.potentialSavings)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Seller View: Marketing Duration & Search Queries */}
      {viewType === 'seller' && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Marketing Duration */}
          <div className="bg-gradient-to-r from-blue-50/40 to-purple-50/40 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Clock size={16} className="text-blue-600" />
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: getPositionColor() + '20',
                  color: getPositionColor(),
                }}
              >
                {marketingDuration.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">Vermarktungsdauer</p>
            <p className="text-lg font-bold text-gray-900">
              {marketingDuration.min}–{marketingDuration.max} Wo.
            </p>
          </div>

          {/* Search Queries */}
          <div className="bg-gradient-to-r from-green-50/40 to-emerald-50/40 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <Users size={16} className="text-green-600" />
              </div>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: getSearchTrendColor(searchQueries.trend) + '20',
                  color: getSearchTrendColor(searchQueries.trend),
                }}
              >
                {getSearchTrendLabel(searchQueries.trend)}
              </span>
            </div>
            <p className="text-xs text-gray-500">Passende Suchanfragen</p>
            <p className="text-lg font-bold text-gray-900">
              ~{searchQueries.count}
            </p>
          </div>
        </div>
      )}

      {/* Min/Max Range if available */}
      {minPricePerSqm && maxPricePerSqm && (
        <div className="mt-3 text-xs text-gray-500 text-center">
          Preisspanne: {formatPrice(minPricePerSqm)} – {formatPrice(maxPricePerSqm)} /m²
        </div>
      )}
    </div>
  );
}
