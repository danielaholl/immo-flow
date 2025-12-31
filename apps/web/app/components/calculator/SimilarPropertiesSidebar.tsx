'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2, TrendingUp, Clock } from 'lucide-react';
import { trpc } from '@/app/providers/TRPCProvider';
import { PropertyCard } from '@rendito/ui';

interface SimilarProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  images: string[];
  ai_investment_score?: number;
  grossYield: number;
  breakEvenYears: number;
  monthlyDifference: number;
  estimatedMonthlyRent: number;
}

interface SimilarPropertiesSidebarProps {
  mode: 'investor' | 'eigennutzer';
  currentSqm?: number;
  currentLocation?: string;
  currentPrice?: number;
  excludePropertyId?: string;
  equityPercentage?: number;
  interestRate?: number;
}

// Badge component for yield/break-even
function MetricBadge({ mode, property }: { mode: 'investor' | 'eigennutzer'; property: SimilarProperty }) {
  if (mode === 'investor') {
    const yield_ = property.grossYield;
    let bgColor = 'bg-amber-500';
    if (yield_ >= 5) bgColor = 'bg-emerald-500';
    else if (yield_ < 3) bgColor = 'bg-red-500';

    return (
      <div className={`${bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg`}>
        <TrendingUp size={12} />
        {yield_.toFixed(1)}% Rendite
      </div>
    );
  }

  const years = property.breakEvenYears;
  let bgColor = 'bg-amber-500';
  let label = `${years.toFixed(0)} Jahre`;

  if (years <= 10) {
    bgColor = 'bg-emerald-500';
  } else if (years >= 25) {
    bgColor = 'bg-red-500';
    label = 'Mieten besser';
  }

  return (
    <div className={`${bgColor} text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg`}>
      <Clock size={12} />
      {label}
    </div>
  );
}

export function SimilarPropertiesSidebar({
  mode,
  currentSqm,
  currentLocation,
  currentPrice,
  excludePropertyId,
  equityPercentage = 20,
  interestRate = 4,
}: SimilarPropertiesSidebarProps) {
  const router = useRouter();
  const similarProperties = trpc.properties.getSimilarPropertiesForCalculator.useQuery(
    {
      mode,
      sqm: currentSqm,
      location: currentLocation,
      price: currentPrice,
      excludePropertyId,
      equityPercentage,
      interestRate,
      limit: 3,
    },
    {
      enabled: Boolean(currentSqm || currentLocation || currentPrice),
      refetchOnWindowFocus: false,
    }
  );

  const isLoading = similarProperties.isLoading;
  const properties = similarProperties.data || [];

  return (
    <div>
      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">
        {mode === 'investor' ? 'Top Rendite Objekte' : 'Passende Kaufobjekte'}
      </h3>

      {isLoading ? (
        // Loading skeleton - horizontal grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse aspect-[3/4]"
            />
          ))}
        </div>
      ) : properties.length > 0 ? (
        // Horizontal grid of property cards
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(properties as SimilarProperty[]).map((property) => (
            <div key={property.id} className="relative h-[320px]">
              {/* Metric Badge - top left */}
              <div className="absolute top-3 left-3 z-30">
                <MetricBadge mode={mode} property={property} />
              </div>

              <PropertyCard
                property={{
                  id: property.id,
                  title: property.title,
                  location: property.location,
                  price: property.price,
                  sqm: property.sqm,
                  rooms: property.rooms,
                  images: property.images || [],
                  aiScore: property.ai_investment_score,
                }}
                onPress={() => router.push(`/property/${property.id}/calculator?tab=${mode}`)}
                showAddress={false}
              />
            </div>
          ))}
        </div>
      ) : (
        // Empty state
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Building2 size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Keine passenden Objekte gefunden
          </p>
        </div>
      )}
    </div>
  );
}
