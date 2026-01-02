'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { PropertyCard } from '@rendito/ui';
import { SimilarPropertyCard } from './SimilarPropertyCard';
import { PropertyBadge } from './PropertyBadge';
import { SimilarPropertiesProps } from './types';

function LoadingSkeleton({ columns, fullWidth }: { columns: number; fullWidth?: boolean }) {
  const colClasses = fullWidth
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const gapClasses = fullWidth ? 'gap-6 sm:gap-8' : 'gap-4';
  const skeletonCount = fullWidth ? 3 : columns;

  return (
    <div className={`grid ${colClasses} ${gapClasses}`}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse ${fullWidth ? 'aspect-[3/4]' : 'h-[320px]'}`}
        />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Building2 size={32} className="text-gray-400 dark:text-gray-500 mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

export function SimilarProperties({
  title,
  subtitle,
  properties = [],
  badgeContext,
  columns = 3,
  isLoading = false,
  emptyMessage = 'Keine passenden Objekte gefunden',
  onPropertyClick,
  linkBuilder,
  fullWidth = false,
}: SimilarPropertiesProps) {
  const router = useRouter();

  // Grid classes based on fullWidth mode
  const colClasses = fullWidth
    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
    : columns === 1
      ? 'grid-cols-1'
      : columns === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  const gapClasses = fullWidth ? 'gap-6 sm:gap-8' : 'gap-4';

  // Wrapper classes for full width mode
  const wrapperClasses = fullWidth
    ? 'max-w-[1800px] mx-auto px-4 lg:px-6'
    : '';

  return (
    <div className={wrapperClasses}>
      <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{subtitle}</p>
      )}
      {!subtitle && <div className="mb-6" />}

      {isLoading ? (
        <LoadingSkeleton columns={columns} fullWidth={fullWidth} />
      ) : properties.length > 0 ? (
        <div className={`grid ${colClasses} ${gapClasses}`}>
          {properties.map((property) => (
            fullWidth ? (
              // Full width mode: Use PropertyCard from @rendito/ui with Badge overlay
              <div key={property.id} className="relative">
                {/* Custom Badge Overlay - top left, same height as AI-Score badge (top-8) */}
                <div className="absolute top-8 left-3 z-30">
                  <PropertyBadge context={badgeContext} property={property} />
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
                  onPress={() => {
                    if (linkBuilder) {
                      router.push(linkBuilder(property.id));
                    } else if (onPropertyClick) {
                      onPropertyClick(property.id);
                    }
                  }}
                  showAddress={false}
                  showActionButtons={false}
                />
              </div>
            ) : (
              // Compact mode: Use custom SimilarPropertyCard
              <SimilarPropertyCard
                key={property.id}
                property={property}
                badgeContext={badgeContext}
                onClick={onPropertyClick ? () => onPropertyClick(property.id) : undefined}
                href={linkBuilder ? linkBuilder(property.id) : undefined}
              />
            )
          ))}
        </div>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </div>
  );
}
