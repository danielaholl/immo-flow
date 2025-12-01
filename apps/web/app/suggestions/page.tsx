'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { getProperties, getUserFavorites, addFavorite, removeFavorite, getUserPropertyConsents } from '@immoflow/api';
import { PropertyCard } from '@immoflow/ui';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';

export default function SuggestionsPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const hasCheckedAuth = useRef(false);

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

  // Load AI suggestions (using top-scored properties as demo)
  useEffect(() => {
    if (user) {
      loadSuggestions();
      loadFavorites();
      loadConsents();
    }
  }, [user]);

  async function loadConsents() {
    if (!user) return;
    try {
      const consentIds = await getUserPropertyConsents(user.id);
      setConsentedPropertyIds(new Set(consentIds));
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  }

  async function loadSuggestions() {
    try {
      setLoading(true);
      // Get properties sorted by AI score (simulating AI suggestions)
      const data = await getProperties({ limit: 6 });
      // Sort by AI score descending
      const sorted = data.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
      setProperties(sorted);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFavorites() {
    if (!user) return;
    try {
      const favorites = await getUserFavorites(user.id);
      const ids = new Set(favorites.map((f: any) => f.property_id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }

  async function handleFavoriteToggle(propertyId: string) {
    if (!user) return;

    try {
      const isFavorited = favoriteIds.has(propertyId);

      if (isFavorited) {
        await removeFavorite(user.id, propertyId);
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(propertyId);
          return next;
        });
      } else {
        await addFavorite({ user_id: user.id, property_id: propertyId });
        setFavoriteIds(prev => new Set(prev).add(propertyId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background">
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
    <main className="min-h-screen bg-background">
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
                    onFavorite={(e) => {
                      e?.preventDefault?.();
                      e?.stopPropagation?.();
                      handleFavoriteToggle(property.id);
                    }}
                    onPress={() => {
                      router.push(`/suggestion/${property.id}`);
                    }}
                    showAddress={shouldShowAddress(property.id)}
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
                <button className="bg-transparent border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:border-gray-400 transition-colors">
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
