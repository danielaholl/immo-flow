'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProperties, addFavorite, removeFavorite, getUserFavorites, getUserPropertyConsents, searchPropertiesWithAI, saveSearchHistory, getPersonalizedFeed, type AISearchCriteria } from '@immoflow/api';
import { PropertyCard, ChatModal, SearchBar } from '@immoflow/ui';
import type { Property } from '@immoflow/database';
import { Header } from './components/Header';
import { useAuthContext } from './providers/AuthProvider';

/**
 * Home Page - Property Listing with WhatsApp-style Slideshow
 */
export default function HomePage() {
  const { user, profile } = useAuthContext();
  const searchParams = useSearchParams();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isSlideshowPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchCriteria, setSearchCriteria] = useState<AISearchCriteria | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Define loadProperties with useCallback
  const loadProperties = useCallback(async () => {
    try {
      setLoading(true);

      // Use personalized feed if user is logged in
      if (user) {
        try {
          const personalizedResults = await getPersonalizedFeed(user.id, {
            limit: 50,
            excludeViewed: false, // Show all for now, can be toggled later
            diversityFactor: 0.3, // Balance between relevance and diversity
          });

          // Extract properties from scored results
          const personalizedProperties = personalizedResults.map(result => result.property);
          setProperties(personalizedProperties);
          setSearchQuery('');
          setSearchCriteria(null);
          return;
        } catch (error) {
          console.error('Error loading personalized feed:', error);
          // Fallback to regular properties on error
        }
      }

      // Fallback: Load all properties for non-logged-in users or on error
      const data = await getProperties({ limit: 50 });
      setProperties(data);
      setSearchQuery('');
      setSearchCriteria(null);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Define handleSearch before useEffect
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadProperties();
      return;
    }

    try {
      setIsSearching(true);
      setLoading(true);
      const result = await searchPropertiesWithAI(query);
      setProperties(result.properties);
      setSearchQuery(result.query);
      setSearchCriteria(result.criteria);

      // Save search to history if user is logged in
      if (user) {
        try {
          await saveSearchHistory({
            user_id: user.id,
            query: result.query,
            criteria: result.criteria,
            results_count: result.count,
          });
        } catch (error) {
          console.error('Error saving search history:', error);
          // Don't throw - saving history is not critical
        }
      }
    } catch (error) {
      console.error('Error searching properties:', error);
      // Fallback to loading all properties
      loadProperties();
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  }, [user, loadProperties]);

  // useEffect to handle URL search parameter
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    if (searchFromUrl) {
      handleSearch(searchFromUrl);
    } else {
      loadProperties();
    }
  }, [searchParams, handleSearch]);

  const loadFavorites = useCallback(async () => {
    if (!user) return;
    try {
      const favorites = await getUserFavorites(user.id);
      const ids = new Set(favorites.map((f: any) => f.property_id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [user]);

  const loadConsents = useCallback(async () => {
    if (!user) return;
    try {
      const consentIds = await getUserPropertyConsents(user.id);
      setConsentedPropertyIds(new Set(consentIds));
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadFavorites();
      loadConsents();
    }
  }, [user, loadFavorites, loadConsents]);

  // Helper to check if address should be shown for a property
  const shouldShowAddress = (propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  };

  async function handleFavoriteToggle(propertyId: string) {
    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login?redirectTo=/';
      return;
    }

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

  // Handle slideshow completion - move to next card
  const handleSlideshowComplete = useCallback((cardIndex: number) => {
    if (cardIndex < properties.length - 1) {
      setActiveCardIndex(cardIndex + 1);
    } else {
      // Loop back to first card
      setActiveCardIndex(0);
    }
  }, [properties.length]);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="w-full max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Finde deine Traumimmobilie
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Für alle, die mehr als vier Wände suchen.
          </p>

          {/* Search Bar */}
          <SearchBar onSearch={handleSearch} className="max-w-4xl mx-auto" />
        </div>
      </section>

      {/* Properties Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-3xl font-bold text-text-primary mb-2">
              {searchQuery ? 'Suchergebnisse' : user ? 'Für dich empfohlen' : 'Alle Immobilien'}
            </h3>
            {!searchQuery && user && (
              <p className="text-sm text-gray-600 mb-2">
                Basierend auf deinen Vorlieben und Interaktionen
              </p>
            )}
            {searchQuery && searchCriteria && (
              <div className="flex flex-wrap gap-2 items-center">
                <p className="text-sm text-gray-600">
                  Suche nach: <span className="font-medium">{searchQuery}</span>
                </p>
                {searchCriteria.location && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                    📍 {searchCriteria.location}
                  </span>
                )}
                {searchCriteria.rooms && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                    🏠 {searchCriteria.rooms} Zimmer
                  </span>
                )}
                {searchCriteria.maxPrice && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    💰 bis {searchCriteria.maxPrice.toLocaleString('de-DE')}€
                  </span>
                )}
                {searchCriteria.features && searchCriteria.features.length > 0 && (
                  searchCriteria.features.map((feature, index) => (
                    <span key={index} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      ✨ {feature}
                    </span>
                  ))
                )}
                <button
                  onClick={loadProperties}
                  className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Zurücksetzen
                </button>
              </div>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500">
              {properties.length} Ergebnis{properties.length !== 1 ? 'se' : ''}
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
        ) : properties.length === 0 ? (
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
                onClick={loadProperties}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Alle Immobilien anzeigen
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map((property, index) => (
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
                  isOwner={user ? property.seller_id === user.id : false}
                  isFavorite={favoriteIds.has(property.id)}
                  onFavorite={user && property.seller_id !== user.id ? (e) => {
                    e?.preventDefault?.();
                    e?.stopPropagation?.();
                    handleFavoriteToggle(property.id);
                  } : undefined}
                  onPress={() => {
                    window.location.href = `/property/${property.id}`;
                  }}
                  isActive={index === activeCardIndex && !isSlideshowPaused}
                  onSlideshowComplete={() => handleSlideshowComplete(index)}
                  slideshowDuration={3000}
                  showAddress={shouldShowAddress(property.id)}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-secondary text-text-inverse py-12 mt-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-bold mb-4">Nestela</h4>
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
            © {new Date().getFullYear()} Nestela. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <button
        onClick={() => setIsChatModalOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-primary hover:bg-primary/90 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center z-40 hover:scale-110 active:scale-95"
        aria-label="KI-Assistent öffnen"
      >
        <svg
          className="w-7 h-7"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      </button>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
      />
    </main>
  );
}
