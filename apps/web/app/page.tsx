'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PropertyCard, SearchBar } from '@immoflow/ui';
import type { Property } from '@immoflow/database';
import { Header } from './components/Header';
import { useAuthContext } from './providers/AuthProvider';
import { trpc } from '@/lib/trpc';

/**
 * Home Page - Property Listing with WhatsApp-style Slideshow
 */
export default function HomePage() {
  // Performance tracking - count renders but don't spam console
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Only log first render and then summary at end
  const pageLoadStartTimeRef = useRef(performance.now());

  if (renderCountRef.current === 1) {
    console.log('🏠 [PERF] HomePage: Initial render');
  }

  const { user, profile, loading: authLoading } = useAuthContext();
  const searchParams = useSearchParams();
  const hasGlobalConsent = profile?.global_address_consent ?? false;

  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isSlideshowPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);

  // Fetch properties with tRPC
  const { data: properties = [], isLoading: loading, refetch: refetchProperties } = trpc.properties.getAll.useQuery(
    { limit: 20, status: 'active' },
    {
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        const duration = performance.now() - pageLoadStartTimeRef.current;
        console.log(`📦 [PERF] Loaded ${data.length} properties in ${duration.toFixed(2)}ms`);
      },
    }
  );

  // Fetch favorites if user is logged in (wait for auth to finish loading)
  const { data: favoritesData = [] } = trpc.favorites.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    refetchOnWindowFocus: false,
  });

  // Fetch dismissed properties if user is logged in (wait for auth to finish loading)
  const { data: dismissedData = [] } = trpc.dismissed.getAll.useQuery(undefined, {
    enabled: !authLoading && !!user,
    refetchOnWindowFocus: false,
  });

  // Extract favorite IDs from favorites data
  const favoriteIds = new Set(favoritesData.map((f: any) => f.property?.id).filter(Boolean));

  // Extract dismissed property IDs
  const dismissedIds = new Set(dismissedData.map((d: any) => d.property_id).filter(Boolean));

  // Get tRPC utils for cache invalidation
  const utils = trpc.useContext();

  // Mutations for favorites
  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      // Refetch favorites to update the list
      utils.favorites.getAll.invalidate();
    },
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      // Refetch favorites to update the list
      utils.favorites.getAll.invalidate();
    },
  });

  // Mutation for dismissing properties
  const dismissMutation = trpc.dismissed.dismiss.useMutation({
    onSuccess: () => {
      // Invalidate dismissed query to update the list
      utils.dismissed.getAll.invalidate();
    },
  });

  // Mutation for un-dismissing properties
  const undismissMutation = trpc.dismissed.undismiss.useMutation({
    onSuccess: () => {
      // Invalidate dismissed query to update the list
      utils.dismissed.getAll.invalidate();
    },
  });

  // Track when page is fully loaded
  const pageLoadLoggedRef = useRef(false);
  useEffect(() => {
    if (!loading && properties.length > 0 && !pageLoadLoggedRef.current) {
      const pageLoadTime = performance.now() - pageLoadStartTimeRef.current;
      console.log(`✅ [PERF] Page fully loaded in ${pageLoadTime.toFixed(2)}ms (${(pageLoadTime / 1000).toFixed(2)}s)`);
      console.log(`📊 [PERF] Summary: ${properties.length} properties, ${favoriteIds.size} favorites`);
      console.log(`🔄 [PERF] Total renders: ${renderCountRef.current}`);
      pageLoadLoggedRef.current = true;
    }
  }, [loading, properties.length, favoriteIds.size]);

  // Helper to check if address should be shown for a property
  const shouldShowAddress = useCallback((propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  }, [hasGlobalConsent, consentedPropertyIds]);

  const handleFavoriteToggle = useCallback(async (propertyId: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login?redirectTo=/';
      return;
    }

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
  }, [user, favoriteIds, addFavoriteMutation, removeFavoriteMutation]);

  const handleDismiss = useCallback(async (propertyId: string) => {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login?redirectTo=/';
      return;
    }

    try {
      await dismissMutation.mutateAsync({ propertyId });
    } catch (error) {
      console.error('Error dismissing property:', error);
    }
  }, [user, dismissMutation]);

  const handleUndismiss = useCallback(async (propertyId: string) => {
    if (!user) {
      return;
    }

    try {
      await undismissMutation.mutateAsync({ propertyId });
    } catch (error) {
      console.error('Error un-dismissing property:', error);
    }
  }, [user, undismissMutation]);

  // Handle slideshow completion - move to next card
  const handleSlideshowComplete = useCallback((cardIndex: number, totalProperties: number) => {
    if (cardIndex < totalProperties - 1) {
      setActiveCardIndex(cardIndex + 1);
    } else {
      // Loop back to first card
      setActiveCardIndex(0);
    }
  }, []);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      refetchProperties();
      setSearchQuery('');
      return;
    }

    // TODO: Implement AI search on backend
    console.log('AI search not yet implemented:', query);
    setSearchQuery(query);
    setIsSearching(false);
  }, [refetchProperties]);

  // Filter out dismissed properties from the feed
  const filteredProperties = properties.filter(property => !dismissedIds.has(property.id));

  return (
    <main className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Weniger suchen. Besser investieren.
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-2xl mx-auto mb-6 sm:mb-8">
            Dein unfairer Vorteil am Immobilienmarkt.
          </p>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Properties Grid */}
      <section className="container mx-auto px-4 py-8 sm:py-12 mb-16 lg:mb-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
              {searchQuery ? 'Suchergebnisse' : 'Dein persönlicher Feed'}
            </h3>
            {searchQuery && (
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-sm text-gray-600">
                  Suche nach: <span className="font-medium">{searchQuery}</span>
                </p>
                <button
                  onClick={() => {
                    refetchProperties();
                    setSearchQuery('');
                  }}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Zurücksetzen
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500">
              {filteredProperties.length} Ergebnis{filteredProperties.length !== 1 ? 'se' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-text-secondary">
              {isSearching ? 'Suche nach passenden Immobilien...' : 'Lade Immobilien...'}
            </p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-2">Keine Immobilien gefunden</p>
            <p className="text-text-secondary text-sm mb-4">
              {searchQuery
                ? 'Versuche es mit anderen Suchkriterien oder weniger spezifischen Angaben'
                : 'Versuche es mit anderen Filterkriterien'
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  refetchProperties();
                  setSearchQuery('');
                }}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Alle Immobilien anzeigen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProperties.map((property, index) => (
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
                    propertyType: property.property_type as any,
                    aiScore: property.ai_score || undefined,
                    ai_investment_score: property.ai_investment_score || undefined,
                    score_color: property.score_color as 'green' | 'yellow' | 'red' | undefined,
                    yield: property.yield || undefined,
                    features: (property.features as string[]) || [],
                    energyClass: property.energy_class || undefined,
                  }}
                  isOwner={user ? property.seller_id === user.id : false}
                  isFavorite={favoriteIds.has(property.id)}
                  onFavorite={user && property.seller_id !== user.id ? (e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    handleFavoriteToggle(property.id);
                  } : undefined}
                  onDismiss={user && property.seller_id !== user.id ? (e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    handleDismiss(property.id);
                  } : undefined}
                  onPress={() => {
                    window.location.href = `/property/${property.id}`;
                  }}
                  isActive={index === activeCardIndex && !isSlideshowPaused}
                  onSlideshowComplete={() => handleSlideshowComplete(index, filteredProperties.length)}
                  slideshowDuration={3000}
                  showAddress={shouldShowAddress(property.id)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Dismissed Properties Section */}
        {user && dismissedData.length > 0 && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <button
              onClick={() => setShowDismissed(!showDismissed)}
              className="flex items-center justify-between w-full text-left mb-4 hover:opacity-80 transition-opacity"
            >
              <div>
                <h3 className="text-2xl font-bold text-text-primary">
                  Nicht interessiert
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {dismissedData.length} Immobilie{dismissedData.length !== 1 ? 'n' : ''} ausgeblendet
                </p>
              </div>
              <svg
                className={`w-6 h-6 text-gray-500 transition-transform ${showDismissed ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDismissed && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {dismissedData.map((dismissed: any) => {
                  const property = dismissed.property;
                  if (!property) return null;

                  return (
                    <div key={property.id} style={{ position: 'relative', opacity: 0.7 }}>
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
                          propertyType: property.property_type as any,
                          aiScore: property.ai_score || undefined,
                          ai_investment_score: property.ai_investment_score || undefined,
                          score_color: property.score_color as 'green' | 'yellow' | 'red' | undefined,
                          yield: property.yield || undefined,
                          features: (property.features as string[]) || [],
                          energyClass: property.energy_class || undefined,
                        }}
                        isOwner={false}
                        isFavorite={false}
                        onPress={() => {
                          window.location.href = `/property/${property.id}`;
                        }}
                        isActive={false}
                        slideshowDuration={3000}
                        showAddress={shouldShowAddress(property.id)}
                      />
                      {/* Undismiss Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl pointer-events-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUndismiss(property.id);
                          }}
                          className="px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-medium pointer-events-auto shadow-lg"
                        >
                          Wieder anzeigen
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-text-inverse py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-bold mb-4">NestFlow</h4>
              <p className="text-sm opacity-80">
                Die moderne Plattform für Immobilien-Investment in Deutschland
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="opacity-80 hover:opacity-100">
                    Über uns
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="opacity-80 hover:opacity-100">
                    Kontakt
                  </Link>
                </li>
                <li>
                  <Link href="/imprint" className="opacity-80 hover:opacity-100">
                    Impressum
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold mb-4">Rechtliches</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/privacy" className="opacity-80 hover:opacity-100">
                    Datenschutz
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="opacity-80 hover:opacity-100">
                    AGB
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/20 text-center text-sm opacity-80">
            © {new Date().getFullYear()} NestFlow. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>
    </main>
  );
}
