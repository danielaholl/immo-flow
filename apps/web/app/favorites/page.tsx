'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { getUserFavorites, removeFavorite, getUserPropertyConsents, grantPropertyConsent } from '@immoflow/api';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { FavoriteButton } from '../components/FavoriteButton';
import { LocationDisplay } from '../components/LocationDisplay';
import { MapPin, Home, Heart, Calendar, TrendingUp, ChartNoAxesCombined } from 'lucide-react';

interface FavoriteWithProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
  properties: Property;
}

export default function FavoritesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [consentLoading, setConsentLoading] = useState(false);
  const hasCheckedAuth = useRef(false);

  // Helper to check if address should be shown for a property
  const shouldShowAddress = (propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  };

  // Load favorites and consents when user is available
  useEffect(() => {
    if (user) {
      loadFavorites();
      loadConsents();
    }
  }, [user]);

  const loadConsents = async () => {
    if (!user) return;
    try {
      const consentIds = await getUserPropertyConsents(user.id);
      setConsentedPropertyIds(new Set(consentIds));
    } catch (error) {
      console.error('Error loading consents:', error);
    }
  };

  // Redirect to login if not authenticated (after auth is fully loaded)
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      hasCheckedAuth.current = true;
      return;
    }

    const timeout = setTimeout(() => {
      if (!user && !hasCheckedAuth.current) {
        router.push('/auth/login?redirectTo=/favorites');
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, [authLoading, user, router]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await getUserFavorites(user.id);
      setFavorites(data as any);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    if (!user) return;

    try {
      await removeFavorite(user.id, propertyId);
      setFavorites(prev => {
        const newFavorites = prev.filter(f => f.property_id !== propertyId);
        // Adjust selected index if needed
        if (selectedIndex >= newFavorites.length && newFavorites.length > 0) {
          setSelectedIndex(newFavorites.length - 1);
        }
        return newFavorites;
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleGrantConsent = async (propertyId: string) => {
    if (!user) return;

    setConsentLoading(true);
    try {
      await grantPropertyConsent(user.id, propertyId);
      setConsentedPropertyIds(prev => new Set([...prev, propertyId]));
    } catch (error) {
      console.error('Error granting consent:', error);
    } finally {
      setConsentLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#22C55E';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-gray-500">Lade Favoriten...</p>
        </div>
      </main>
    );
  }

  const selectedFavorite = favorites[selectedIndex];
  const selectedProperty = selectedFavorite?.properties;

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {favorites.length === 0 ? (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={48} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Noch keine Favoriten
            </h2>
            <p className="text-gray-500 mb-6">
              Speichern Sie Immobilien, die Ihnen gefallen, um sie später wiederzufinden
            </p>
            <Link href="/">
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                Immobilien entdecken
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
          {/* Left Column - Favorites List */}
          <div className="lg:w-1/4 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Meine Favoriten</h1>
              <p className="text-gray-500 text-sm mb-4">{favorites.length} gespeicherte Immobilien</p>

              <div className="space-y-3">
                {favorites.map((favorite, index) => {
                  const property = favorite.properties;
                  if (!property) return null;

                  const isSelected = index === selectedIndex;

                  return (
                    <div
                      key={favorite.id}
                      onClick={() => setSelectedIndex(index)}
                      className={`group cursor-pointer bg-white border rounded-xl overflow-hidden transition-all ${
                        isSelected
                          ? 'border-primary shadow-md ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex">
                        {/* Thumbnail */}
                        <div className="relative w-28 h-28 flex-shrink-0 bg-gray-100">
                          {property.images && property.images.length > 0 ? (
                            <img
                              src={property.images[0]}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home size={32} className="text-gray-300" />
                            </div>
                          )}
                          {property.ai_score && (
                            <div className="absolute top-1 right-1 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-full">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: getScoreColor(property.ai_score) }}
                              />
                              <span className="text-white text-xs font-medium">{property.ai_score}</span>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-3 min-w-0">
                          <p className="text-primary font-bold text-sm">{formatPrice(property.price)}</p>
                          <h3 className="font-medium text-gray-900 text-sm truncate mt-0.5">{property.title}</h3>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 truncate">
                            <MapPin size={10} className="flex-shrink-0" />
                            <span className="truncate">{property.location}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{property.rooms} Zi.</span>
                            <span>•</span>
                            <span>{property.sqm} m²</span>
                            <span>•</span>
                            <span>{formatPrice(Math.round(property.price / property.sqm))}/m²</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Property Details (same as detail page) */}
          <div className="lg:w-3/4 flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
            {selectedProperty ? (
              <>
                {/* Left - Image Slideshow */}
                <div className="lg:w-1/2 lg:sticky lg:top-0 lg:h-full p-4 lg:p-6">
                  <PropertyImageSlideshow
                    images={selectedProperty.images}
                    title={selectedProperty.title}
                    className="h-full shadow-xl"
                    showCounter={true}
                    showProgressBars={true}
                    slideshowId={`favorites-${selectedProperty.id}`}
                    overlay={
                      user && (
                        <FavoriteButton
                          userId={user.id}
                          propertyId={selectedProperty.id}
                          isFavorite={true}
                          onToggle={(newState) => {
                            if (!newState) {
                              handleRemoveFavorite(selectedProperty.id);
                            }
                          }}
                          size="lg"
                          variant="overlay"
                          className="absolute top-14 right-4 z-20"
                        />
                      )
                    }
                  />
                </div>

                {/* Right - Property Details (Scrollable) */}
                <div className="lg:w-1/2 lg:overflow-y-auto p-4 lg:p-8 flex flex-col lg:h-full">
                  {/* Unlock Full Details Section - Only show if no consent */}
                  {!shouldShowAddress(selectedProperty.id) && (
                    <div className="mb-8 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                      <h3 className="text-xl font-bold mb-3 text-gray-900">
                        Vollständige Details freischalten
                      </h3>
                      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
                        Um die vollständige Adresse und weitere Details zu sehen, stimmen Sie bitte der Weitergabe Ihrer Kontaktdaten an den Makler zu.
                      </p>
                      <button
                        onClick={() => handleGrantConsent(selectedProperty.id)}
                        disabled={consentLoading}
                        className="bg-gray-900 text-white font-semibold py-2.5 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {consentLoading ? 'Wird freigeschaltet...' : 'Adresse freischalten'}
                      </button>
                    </div>
                  )}

                  {/* Price */}
                  <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '33px' }}>
                    {formatPrice(selectedProperty.price)}
                  </h1>

                  {/* Location */}
                  <LocationDisplay
                    location={selectedProperty.location}
                    address={selectedProperty.address}
                    showAddress={shouldShowAddress(selectedProperty.id)}
                    className="mb-4"
                    style={{ fontSize: '18px' }}
                  />

                  {/* Title */}
                  <h2 className="font-semibold text-gray-900 mb-6" style={{ fontSize: '22px' }}>
                    {selectedProperty.title}
                  </h2>

                  {/* Details Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                      <p className="text-sm text-gray-500">Zimmer</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedProperty.rooms}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fläche</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedProperty.sqm} m²</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Preis/m²</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatPrice(Math.round(selectedProperty.price / selectedProperty.sqm))}
                      </p>
                    </div>
                  </div>

                  {/* Yield */}
                  {selectedProperty.yield && (
                    <div className="flex items-center gap-2 mb-6 pb-6 border-b border-gray-200">
                      <ChartNoAxesCombined size={20} className="text-gray-700" />
                      <span className="text-lg font-semibold text-gray-900">{selectedProperty.yield}% Rendite</span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedProperty.description && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Beschreibung</h3>
                      <p className="text-gray-700 leading-relaxed" style={{ fontSize: '18px' }}>
                        {selectedProperty.description}
                      </p>
                    </div>
                  )}

                  {/* Features */}
                  {selectedProperty.features && selectedProperty.features.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausstattung</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProperty.features.map((feature, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-white border-2 border-gray-900 text-gray-900 rounded-full text-base font-medium"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* KI-Bewertung */}
                  {selectedProperty.ai_score && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <div className="bg-white border border-gray-200 rounded-2xl p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-2">
                            <TrendingUp size={20} className="text-gray-700" />
                            <h3 className="text-lg font-semibold text-gray-900">KI-Bewertung</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: getScoreColor(selectedProperty.ai_score) }}
                            />
                            <span className="text-2xl font-bold text-gray-900">{selectedProperty.ai_score}/100</span>
                          </div>
                        </div>

                        {/* Score Categories */}
                        <div className="space-y-4">
                          {/* Lage */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Lage</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(95, selectedProperty.ai_score + 3)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.min(95, selectedProperty.ai_score + 3)}</span>
                          </div>

                          {/* Rendite */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Rendite</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(70, selectedProperty.ai_score - 7)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.max(70, selectedProperty.ai_score - 7)}</span>
                          </div>

                          {/* Wertsteigerung */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Wertsteigerung</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(95, selectedProperty.ai_score + 3)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.min(95, selectedProperty.ai_score + 3)}</span>
                          </div>

                          {/* Steuervorteile */}
                          <div className="flex items-center justify-end gap-4">
                            <span className="text-gray-600 flex-1">Steuervorteile</span>
                            <div className="w-40 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.max(75, selectedProperty.ai_score - 2)}%`,
                                  backgroundColor: '#22C55E'
                                }}
                              />
                            </div>
                            <span className="text-gray-700 font-medium w-8 text-right">{Math.max(75, selectedProperty.ai_score - 2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Highlights */}
                  {selectedProperty.highlights && selectedProperty.highlights.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Highlights</h3>
                      <ul className="space-y-2">
                        {selectedProperty.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-500">✓</span>
                            <span className="text-gray-700" style={{ fontSize: '18px' }}>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Red Flags */}
                  {selectedProperty.red_flags && selectedProperty.red_flags.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Zu beachten</h3>
                      <ul className="space-y-2">
                        {selectedProperty.red_flags.map((flag, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-amber-600">
                            <span>⚠️</span>
                            <span style={{ fontSize: '18px' }}>{flag}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Besichtigungstermine */}
                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar size={20} className="text-gray-700" />
                      <h3 className="text-lg font-semibold text-gray-900">Besichtigungstermine</h3>
                    </div>
                    <div className="space-y-2">
                      <div
                        onClick={() => alert('Termin wird gebucht...')}
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-pointer"
                      >
                        <div className="font-medium text-gray-900">Montag, 1. Dezember 2025</div>
                        <div className="text-sm text-gray-500">14:00 Uhr</div>
                      </div>
                      <div
                        onClick={() => alert('Termin wird gebucht...')}
                        className="p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-pointer"
                      >
                        <div className="font-medium text-gray-900">Mittwoch, 3. Dezember 2025</div>
                        <div className="text-sm text-gray-500">16:00 Uhr</div>
                      </div>
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl opacity-60">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-500">Freitag, 5. Dezember 2025</div>
                            <div className="text-sm text-gray-400">10:00 Uhr</div>
                          </div>
                          <span className="text-sm text-gray-500">Ausgebucht</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto bg-white pt-4 pb-4">
                    <button
                      onClick={() => handleRemoveFavorite(selectedProperty.id)}
                      className="flex-1 bg-white border-2 border-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-xl hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <Heart size={20} className="fill-primary text-primary" />
                      Aus Favoriten entfernen
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Wählen Sie einen Favoriten aus der Liste
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
