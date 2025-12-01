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
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { MapPin, Home, Heart } from 'lucide-react';

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

  // Convert property data to PropertyPreview format
  const propertyPreviewData: PropertyPreviewData | null = selectedProperty ? {
    images: selectedProperty.images || [],
    price: selectedProperty.price || 0,
    commission_rate: selectedProperty.commission_rate,
    location: selectedProperty.location || '',
    address: selectedProperty.address,
    title: selectedProperty.title || '',
    type: selectedProperty.property_type,
    sqm: selectedProperty.sqm || 0,
    rooms: selectedProperty.rooms || 0,
    description: selectedProperty.description || '',
    features: selectedProperty.features,
    yield: selectedProperty.yield,
    highlights: selectedProperty.highlights,
    red_flags: selectedProperty.red_flags,
    ai_investment_score: selectedProperty.ai_score,
    require_address_consent: selectedProperty.require_address_consent,
  } : null;

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
                <div className="lg:w-1/2 flex flex-col lg:h-full">
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {propertyPreviewData && (
                      <PropertyPreview
                        data={propertyPreviewData}
                        showAddress={shouldShowAddress(selectedProperty.id)}
                        className="!shadow-none !rounded-none !bg-transparent"
                        hasConsent={shouldShowAddress(selectedProperty.id)}
                        isOwner={false}
                        consentLoading={consentLoading}
                        isUserLoggedIn={Boolean(user)}
                        onGrantConsent={() => handleGrantConsent(selectedProperty.id)}
                        showInvestmentScore={true}
                      />
                    )}
                  </div>

                  {/* CTA Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 lg:p-8 pt-4">
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
