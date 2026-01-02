'use client';

import React from 'react';
import { trpc } from '@/app/providers/TRPCProvider';
import { SimilarProperties, SimilarProperty } from '../SimilarProperties';

interface SimilarPropertiesSidebarProps {
  mode: 'investor' | 'eigennutzer';
  currentSqm?: number;
  currentLocation?: string;
  currentPrice?: number;
  excludePropertyId?: string;
  equityPercentage?: number;
  interestRate?: number;
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

  const properties = (similarProperties.data || []) as SimilarProperty[];

  return (
    <SimilarProperties
      title={mode === 'investor' ? 'Top Rendite Objekte' : 'Passende Kaufobjekte'}
      properties={properties}
      badgeContext={mode}
      isLoading={similarProperties.isLoading}
      linkBuilder={(id) => `/property/${id}/calculator`}
      fullWidth
    />
  );
}
