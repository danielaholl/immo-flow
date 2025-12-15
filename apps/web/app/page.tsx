'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { PropertyCard, SearchBar } from '@immoflow/ui';
import type { Property } from '@immoflow/database';
import { Header } from './components/Header';
import { useAuthContext } from './providers/AuthProvider';
import { trpc } from '@/lib/trpc';
import { useAuthGuard } from './hooks/useAuthGuard';
import { LoginPromptModal } from './components/LoginPromptModal';

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
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<any | null>(null);
  const [searchTotal, setSearchTotal] = useState<number>(0);

  // Initialize auth guard for protected actions
  const {
    guard,
    showLoginModal,
    setShowLoginModal,
    pendingActionDescription,
  } = useAuthGuard({
    returnUrl: '/',
  });

  // Fetch properties with tRPC - Use personalized feed for logged-in users, trending for guests
  const personalizedFeedQuery = trpc.recommendations.getPersonalizedFeed.useQuery(
    { page: 1, limit: 20 },
    {
      enabled: !authLoading && !!user,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        const duration = performance.now() - pageLoadStartTimeRef.current;
        console.log(`📦 [PERF-PERSONALIZED] Loaded ${data.properties.length} personalized properties in ${duration.toFixed(2)}ms`);
      },
    }
  );

  const trendingFeedQuery = trpc.recommendations.getTrendingFeed.useQuery(
    { limit: 20 },
    {
      enabled: !authLoading && !user,
      refetchOnWindowFocus: false,
      onSuccess: (data) => {
        const duration = performance.now() - pageLoadStartTimeRef.current;
        console.log(`📦 [PERF-TRENDING] Loaded ${data.properties.length} trending properties in ${duration.toFixed(2)}ms`);
      },
    }
  );

  // Use personalized feed if authenticated, otherwise trending
  const properties = user ? (personalizedFeedQuery.data?.properties || []) : (trendingFeedQuery.data?.properties || []);
  const loading = user ? personalizedFeedQuery.isLoading : trendingFeedQuery.isLoading;
  const refetchProperties = user ? personalizedFeedQuery.refetch : trendingFeedQuery.refetch;

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

  // AI Search mutation
  const aiSearchMutation = trpc.aiSearch.search.useMutation({
    onSuccess: (data) => {
      console.log(`🔍 [AI Search] Found ${data.total} properties in ${data.processingTime}ms`);
      setSearchResults(data.properties);
      setSearchCriteria(data.criteria);
      setSearchTotal(data.total);
      setIsSearching(false);
    },
    onError: (error) => {
      console.error('AI Search error:', error);
      setIsSearching(false);
    },
  });

  // Search by criteria mutation (for filter updates)
  const searchByCriteriaMutation = trpc.aiSearch.searchByCriteria.useMutation({
    onSuccess: (data) => {
      console.log(`🔍 [Criteria Search] Found ${data.total} properties`);
      setSearchResults(data.properties);
      setSearchCriteria(data.criteria);
      setSearchTotal(data.total);
      setIsSearching(false);
    },
    onError: (error) => {
      console.error('Criteria Search error:', error);
      setIsSearching(false);
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

  // Ref to track if initial search from URL has been done
  const initialSearchDone = useRef(false);

  // Helper to check if address should be shown for a property
  const shouldShowAddress = useCallback((propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  }, [hasGlobalConsent, consentedPropertyIds]);

  // Create guarded favorite handler
  const handleFavoriteToggle = useCallback((propertyId: string) => {
    // Wrap the actual favorite logic with auth guard
    const toggleFavorite = guard(async () => {
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
    }, 'Diese Immobilie als Favorit markieren');

    toggleFavorite();
  }, [guard, favoriteIds, addFavoriteMutation, removeFavoriteMutation]);

  // Create guarded dismiss handler
  const handleDismiss = useCallback((propertyId: string) => {
    // Wrap the actual dismiss logic with auth guard
    const dismissProperty = guard(async () => {
      try {
        await dismissMutation.mutateAsync({ propertyId });
      } catch (error) {
        console.error('Error dismissing property:', error);
      }
    }, 'Diese Immobilie als "Kein Interesse" markieren');

    dismissProperty();
  }, [guard, dismissMutation]);

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

  // Handle search - AI-powered natural language search
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // Reset to normal feed
      setSearchResults(null);
      setSearchCriteria(null);
      setSearchQuery('');
      setSearchTotal(0);
      refetchProperties();
      return;
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      await aiSearchMutation.mutateAsync({
        query: query.trim(),
        limit: 20,
        offset: 0,
      });
    } catch (error) {
      console.error('Search failed:', error);
      setIsSearching(false);
    }
  }, [refetchProperties, aiSearchMutation]);

  // Handle search query from URL (for repeat searches from profile page)
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam && !initialSearchDone.current && !authLoading) {
      initialSearchDone.current = true;
      handleSearch(searchParam);
    }
  }, [searchParams, authLoading, handleSearch]);

  // Clear search and return to feed
  const clearSearch = useCallback(() => {
    setSearchResults(null);
    setSearchCriteria(null);
    setSearchQuery('');
    setSearchTotal(0);
    refetchProperties();
  }, [refetchProperties]);

  // Remove a single criterion from the search
  const removeCriterion = useCallback((key: string) => {
    if (!searchCriteria) return;

    const newCriteria = { ...searchCriteria };
    delete newCriteria[key];

    // Check if any meaningful criteria remain (excluding confidence)
    const hasAnyCriteria = Object.entries(newCriteria).some(
      ([k, v]) => k !== 'confidence' && v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : true)
    );

    if (!hasAnyCriteria) {
      clearSearch();
    } else {
      // Trigger new search with updated criteria
      setIsSearching(true);
      searchByCriteriaMutation.mutate({
        criteria: newCriteria,
        limit: 20,
        offset: 0,
      });
    }
  }, [searchCriteria, clearSearch, searchByCriteriaMutation]);

  // Use search results if available, otherwise use feed properties
  const displayProperties = searchResults ?? properties;

  // Filter out dismissed properties from the display
  const filteredProperties = displayProperties.filter(property => !dismissedIds.has(property.id));

  // Format price for display
  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)} Mio €`;
    }
    return `${(price / 1000).toFixed(0)}T €`;
  };

  // Get criteria display items for filter tags
  const getCriteriaDisplayItems = () => {
    if (!searchCriteria) return [];

    const items: { key: string; label: string; value: string }[] = [];

    if (searchCriteria.location) {
      items.push({
        key: 'location',
        label: 'Ort',
        value: searchCriteria.district
          ? `${searchCriteria.location} - ${searchCriteria.district}`
          : searchCriteria.location,
      });
    } else if (searchCriteria.district) {
      items.push({ key: 'district', label: 'Bezirk', value: searchCriteria.district });
    }

    if (searchCriteria.propertyType) {
      const typeLabels: Record<string, string> = {
        apartment: 'Wohnung',
        house: 'Haus',
        villa: 'Villa',
        commercial: 'Gewerbe',
        land: 'Grundstück',
      };
      items.push({
        key: 'propertyType',
        label: 'Typ',
        value: typeLabels[searchCriteria.propertyType] || searchCriteria.propertyType,
      });
    }

    if (searchCriteria.rooms) {
      items.push({ key: 'rooms', label: 'Zimmer', value: `${searchCriteria.rooms} Zi` });
    } else if (searchCriteria.minRooms || searchCriteria.maxRooms) {
      const roomRange = searchCriteria.minRooms && searchCriteria.maxRooms
        ? `${searchCriteria.minRooms}-${searchCriteria.maxRooms} Zi`
        : searchCriteria.minRooms
          ? `ab ${searchCriteria.minRooms} Zi`
          : `bis ${searchCriteria.maxRooms} Zi`;
      items.push({ key: 'rooms', label: 'Zimmer', value: roomRange });
    }

    if (searchCriteria.minPrice || searchCriteria.maxPrice) {
      const priceRange = searchCriteria.minPrice && searchCriteria.maxPrice
        ? `${formatPrice(searchCriteria.minPrice)} - ${formatPrice(searchCriteria.maxPrice)}`
        : searchCriteria.minPrice
          ? `ab ${formatPrice(searchCriteria.minPrice)}`
          : `bis ${formatPrice(searchCriteria.maxPrice)}`;
      items.push({ key: 'price', label: 'Preis', value: priceRange });
    }

    if (searchCriteria.minSqm || searchCriteria.maxSqm) {
      const sqmRange = searchCriteria.minSqm && searchCriteria.maxSqm
        ? `${searchCriteria.minSqm}-${searchCriteria.maxSqm} m²`
        : searchCriteria.minSqm
          ? `ab ${searchCriteria.minSqm} m²`
          : `bis ${searchCriteria.maxSqm} m²`;
      items.push({ key: 'sqm', label: 'Fläche', value: sqmRange });
    }

    if (searchCriteria.condition) {
      const conditionLabels: Record<string, string> = {
        new: 'Neubau',
        first_occupancy: 'Erstbezug',
        renovated: 'Renoviert',
        maintained: 'Gepflegt',
        needs_renovation: 'Renovierungsbedürftig',
      };
      items.push({
        key: 'condition',
        label: 'Zustand',
        value: conditionLabels[searchCriteria.condition] || searchCriteria.condition,
      });
    }

    if (searchCriteria.features && searchCriteria.features.length > 0) {
      searchCriteria.features.forEach((feature: string, index: number) => {
        items.push({ key: `feature_${index}`, label: 'Feature', value: feature });
      });
    }

    return items;
  };

  return (
    <main className="min-h-screen bg-accent-cream pb-20 lg:pb-0">
      {/* Header */}
     <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-accent-cream to-white py-8 sm:py-12 lg:py-16">
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
                  Suche: <span className="font-medium">&quot;{searchQuery}&quot;</span>
                </p>
                <button
                  onClick={clearSearch}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Zurücksetzen
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {searchCriteria?.confidence && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"/>
                </svg>
                <span>KI {Math.round(searchCriteria.confidence * 100)}%</span>
              </div>
            )}
            {searchQuery && (
              <p className="text-sm text-gray-500">
                {searchTotal} Ergebnis{searchTotal !== 1 ? 'se' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Search Criteria Filter Tags */}
        {searchCriteria && getCriteriaDisplayItems().length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {getCriteriaDisplayItems().map(({ key, value }) => (
              <span
                key={key}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-sky text-gray-700 text-sm font-medium rounded-full border border-blue-200"
              >
                {value}
                <button
                  onClick={() => removeCriterion(key)}
                  className="ml-1 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Filter entfernen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <button
              onClick={clearSearch}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-gray-500 text-sm hover:text-accent-aqua transition-colors"
            >
              Alle Filter löschen
            </button>
          </div>
        )}

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
                onClick={clearSearch}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Alle Immobilien anzeigen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProperties.map((property, index) => {
              // Show favorite button unless user explicitly owns this property
              const shouldShowFavoriteButton = !(user && property.seller_id === user.id);
              return (
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
                  onFavorite={shouldShowFavoriteButton ? (e: React.MouseEvent) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    handleFavoriteToggle(property.id);
                  } : undefined}
                  onDismiss={shouldShowFavoriteButton ? (e: React.MouseEvent) => {
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
            );
            })}
          </div>
        )}

        {/* Dismissed Properties Section */}
        {user && dismissedData.length > 0 && (
          <div className="mt-12 pt-8 border-t border-accent-cream-dark">
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
                          className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-semibold pointer-events-auto shadow-glow"
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

      {/* Login Prompt Modal - Progressive Disclosure */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        action={pendingActionDescription}
        returnUrl="/"
      />
    </main>
  );
}
