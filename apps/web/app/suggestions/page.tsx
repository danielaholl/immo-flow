'use client';

import { useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { trpc } from '@/app/providers/TRPCProvider';
import { PropertyCard } from '@rendito/ui';
import type { Property } from '@rendito/database';
import { Header } from '../components/Header';

export default function SuggestionsPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const router = useRouter();
  const hasCheckedAuth = useRef(false);

  // Fetch properties using tRPC
  const { data: propertiesData, isLoading: propertiesLoading } = trpc.properties.getAll.useQuery(
    { limit: 6 },
    { enabled: !!user }
  );

  // Fetch favorites using tRPC
  const { data: favoritesData } = trpc.favorites.getAll.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Fetch consents using tRPC
  const { data: consentsData } = trpc.consents.getUserPropertyConsents.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Mutations for favorites
  const utils = trpc.useContext();
  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
    },
  });
  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
    },
  });

  // Process data
  const properties = useMemo(() => {
    if (!propertiesData) return [];
    // Sort by AI score descending
    return [...propertiesData].sort((a: any, b: any) => (b.ai_score || 0) - (a.ai_score || 0));
  }, [propertiesData]);

  const favoriteIds = useMemo(() => {
    if (!favoritesData) return new Set<string>();
    return new Set(favoritesData.map((f: any) => f.property_id));
  }, [favoritesData]);

  const consentedPropertyIds = useMemo(() => {
    if (!consentsData) return new Set<string>();
    return new Set(consentsData.map((c: any) => c.property_id));
  }, [consentsData]);

  const loading = propertiesLoading;

  // Helper to check if address should be shown for a property
  const shouldShowAddress = (propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      hasCheckedAuth.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      if (!user && !hasCheckedAuth.current) {
        router.push('/auth/login?redirectTo=/suggestions');
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [authLoading, user, router]);

  async function handleFavoriteToggle(propertyId: string) {
    if (!user) return;

    try {
      const isFavorited = favoriteIds.has(propertyId);

      if (isFavorited) {
        await removeFavoriteMutation.mutateAsync({ propertyId });
      } else {
        await addFavoriteMutation.mutateAsync({ propertyId });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-text-secondary">Lade KI-Vorschläge...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />

      <div className="container mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
              KI-gestützt
            </span>
          </div>
          <h1 className="text-4xl font-bold text-text-primary mb-2">
            Ihre persönlichen Vorschläge
          </h1>
          <p className="text-text-secondary text-lg">
            Basierend auf Ihren Präferenzen und unserem AI-Investment-Score haben wir diese Immobilien für Sie ausgewählt.
          </p>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-20">
            <div className="mb-4">
              <svg
                className="w-24 h-24 mx-auto text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-text-primary mb-2">
              Noch keine Vorschläge
            </h2>
            <p className="text-text-secondary mb-6">
              Unsere KI analysiert gerade den Markt, um die besten Immobilien für Sie zu finden.
            </p>
            <Link href="/">
              <button className="bg-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                Immobilien entdecken
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Info Box */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">So funktioniert es</h3>
                  <p className="text-gray-600 text-sm">
                    Unser AI-System analysiert Tausende von Immobilien und bewertet sie basierend auf Lage, Preis,
                    Rendite und Zustand. Die Vorschläge werden regelmäßig aktualisiert, sobald neue Immobilien
                    auf den Markt kommen.
                  </p>
                </div>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <div key={property.id} style={{ position: 'relative' }}>
                  <PropertyCard
                    property={{
                      id: property.id,
                      title: property.title,
                      location: property.location,
                      address: property.address || undefined,
                      price: property.price,
                      sqm: property.sqm,
                      rooms: property.rooms,
                      images: (property.images as string[]) || [],
                      aiScore: property.ai_score || undefined,
                      yield: property.yield || undefined,
                      features: (property.features as string[]) || [],
                      energyClass: property.energy_class || undefined,
                    }}
                    isFavorite={favoriteIds.has(property.id)}
                    onFavorite={(e: React.MouseEvent) => {
                      e?.preventDefault?.();
                      e?.stopPropagation?.();
                      handleFavoriteToggle(property.id);
                    }}
                    onPress={() => {
                      router.push(`/suggestion/${property.id}`);
                    }}
                    showAddress={true}
                  />
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="mt-12 text-center">
              <p className="text-text-secondary mb-4">
                Möchten Sie mehr Vorschläge erhalten?
              </p>
              <Link href="/">
                <button className="bg-transparent border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:border-gray-300 transition-colors">
                  Alle Immobilien ansehen
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
