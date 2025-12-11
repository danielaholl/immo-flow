'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export function useMasterDetailNavigation<T extends { id: string }>(
  items: T[],
  basePath: string
) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Safely get property ID from URL (handle SSR case)
  let propertyId: string | null = null;
  try {
    propertyId = searchParams?.get('id') || null;
  } catch (error) {
    console.warn('Error reading searchParams:', error);
  }

  // Find selected item by ID from URL or default to first item (if items exist)
  const selectedItem = items.length > 0
    ? (propertyId ? items.find(item => item.id === propertyId) : null) || items[0]
    : null;

  // Navigate to specific item
  const selectItem = (id: string) => {
    router.push(`${basePath}?id=${id}`, { scroll: false });
  };

  // Navigate back to list (clear selection)
  const goBack = () => {
    router.push(basePath, { scroll: false });
  };

  return {
    selectedItem,
    selectedPropertyId: propertyId,
    selectItem,
    goBack,
    hasSelection: !!propertyId,
  };
}
