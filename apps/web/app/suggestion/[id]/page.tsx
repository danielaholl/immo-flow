'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPropertyById, getUserFavorites, hasPropertyConsent } from '@immoflow/api';
import { ChatModal } from '@immoflow/ui';
import type { Property } from '@immoflow/database';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { MapPin } from 'lucide-react';
import { PropertyImageSlideshow } from '@/app/components/PropertyImageSlideshow';
import { FavoriteButton } from '@/app/components/FavoriteButton';

export default function SuggestionPage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?redirectTo=/suggestion/${params.id}`);
    }
  }, [authLoading, user, router, params.id]);

  useEffect(() => {
    async function loadProperty() {
      if (!user) return;

      try {
        const id = params.id as string;
        const data = await getPropertyById(id);
        if (!data) {
          router.push('/');
          return;
        }
        setProperty(data);
      } catch (error) {
        console.error('Error loading property:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    loadProperty();
  }, [params.id, router, user]);

  // Load favorite status
  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!user || !property) return;
      try {
        const favorites = await getUserFavorites(user.id);
        const isFav = favorites.some((f: any) => f.property_id === property.id);
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Error loading favorite status:', error);
      }
    }
    loadFavoriteStatus();
  }, [user, property]);

  // Load consent status for this property
  useEffect(() => {
    async function loadConsentStatus() {
      if (!user || !property) return;
      try {
        const consent = await hasPropertyConsent(user.id, property.id);
        setHasConsent(consent);
      } catch (error) {
        console.error('Error loading consent status:', error);
      }
    }
    loadConsentStatus();
  }, [user, property]);

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
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Lade Vorschlag...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (!property) {
    return null;
  }

  const pricePerSqm = property.sqm > 0 ? Math.round(property.price / property.sqm) : 0;

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50" style={{ height: '100px' }}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <a href="/" className="font-bold text-gray-900" style={{ fontSize: '29px' }}>
            ← Nestela
          </a>
          <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            KI-Vorschlag
          </span>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">

          {/* Left Column - Property Card with Slideshow */}
          <div className="lg:w-1/2">
            <PropertyImageSlideshow
              images={property.images}
              title={property.title}
              className="aspect-[4/5] shadow-xl"
              duration={4000}
              overlay={
                <>
                  {/* AI Score Badge */}
                  {property.ai_score && (
                    <div className="absolute bottom-6 left-4 flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full z-10">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getScoreColor(property.ai_score) }}
                      />
                      <span className="text-white font-semibold">{property.ai_score}/100</span>
                    </div>
                  )}

                  {/* Favorite Button */}
                  {user && (
                    <FavoriteButton
                      userId={user.id}
                      propertyId={property.id}
                      isFavorite={isFavorite}
                      onToggle={setIsFavorite}
                      size="lg"
                      variant="overlay"
                      className="absolute top-14 right-4 z-20"
                    />
                  )}
                </>
              }
            />
          </div>

          {/* Right Column - Property Details */}
          <div className="lg:w-1/2">
            {/* Price */}
            <h1 className="font-bold text-gray-900 mb-2" style={{ fontSize: '33px' }}>
              {formatPrice(property.price)}
            </h1>

            {/* Location */}
            <div className="flex items-center gap-2 text-gray-600 mb-4" style={{ fontSize: '18px' }}>
              <MapPin size={20} />
              <span>{property.location}{(hasGlobalConsent || hasConsent) && property.address ? ` • ${property.address}` : ''}</span>
            </div>

            {/* Title */}
            <h2 className="font-semibold text-gray-900 mb-6" style={{ fontSize: '22px' }}>
              {property.title}
            </h2>

            {/* Details Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Zimmer</p>
                <p className="text-lg font-semibold text-gray-900">{property.rooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fläche</p>
                <p className="text-lg font-semibold text-gray-900">{property.sqm} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Preis/m²</p>
                <p className="text-lg font-semibold text-gray-900">{formatPrice(pricePerSqm)}</p>
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <p className="text-gray-700 mb-8 leading-relaxed" style={{ fontSize: '18px' }}>
                {property.description}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push(`/property/${property.id}`)}
                className="flex-1 bg-gray-900 text-white font-semibold py-4 px-6 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Details ansehen & Termin buchen
              </button>

              <button
                onClick={() => setIsChatModalOpen(true)}
                className="flex-1 bg-white border-2 border-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-xl hover:border-gray-400 transition-colors"
              >
                KI-Assistent fragen
              </button>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausstattung</h3>
                <div className="flex flex-wrap gap-2">
                  {property.features.map((feature, idx) => (
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

            {/* Highlights */}
            {property.highlights && property.highlights.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Highlights</h3>
                <ul className="space-y-2">
                  {property.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-500">✓</span>
                      <span className="text-gray-700" style={{ fontSize: '18px' }}>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red Flags */}
            {property.red_flags && property.red_flags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Zu beachten</h3>
                <ul className="space-y-2">
                  {property.red_flags.map((flag, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-amber-600">
                      <span>⚠️</span>
                      <span style={{ fontSize: '18px' }}>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
      />
    </main>
  );
}
