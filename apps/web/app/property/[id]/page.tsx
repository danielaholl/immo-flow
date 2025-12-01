'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPropertyWithOwner, PropertyWithOwner, hasPropertyConsent, grantPropertyConsent, deactivateProperty, getUserFavorites, upsertConsent, hasFullConsent, trackInteraction, updateUserPreferences, getPropertyEvaluation, PropertyAIEvaluation } from '@immoflow/api';
import { formatPrice } from '@immoflow/utils';
import { ChatModal } from '@immoflow/ui';
import { Pencil, Power } from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { PropertyImageSlideshow } from '@/app/components/PropertyImageSlideshow';
import { FavoriteButton } from '@/app/components/FavoriteButton';
import { CommissionConsentDialog } from '@/app/components/CommissionConsentDialog';
import { PropertyPreview, PropertyPreviewData } from '@/app/components/PropertyPreview';

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const [property, setProperty] = useState<PropertyWithOwner | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [hasCommissionConsent, setHasCommissionConsent] = useState(false);
  const [evaluation, setEvaluation] = useState<PropertyAIEvaluation | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);

  // Track time spent on page for recommendations
  const pageLoadTime = useRef<number>(Date.now());
  const hasTrackedView = useRef<boolean>(false);

  // Check if current user is the owner of this property
  const isOwner = user && property && property.user_id === user.id;

  const handleProtectedAction = (action: () => void) => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }
    action();
  };

  useEffect(() => {
    async function loadProperty() {
      try {
        const id = params.id as string;
        const data = await getPropertyWithOwner(id);
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
  }, [params.id, router]);

  // Load user consent status for this specific property
  useEffect(() => {
    async function loadConsentStatus() {
      if (!user || !property) {
        setHasConsent(false);
        setHasCommissionConsent(false);
        return;
      }
      try {
        // Check old property consent (for address visibility)
        const propertyConsent = await hasPropertyConsent(user.id, property.id);
        setHasConsent(propertyConsent);

        // Check new commission consent (for address + commission agreement)
        const fullConsent = await hasFullConsent(user.id, property.id);
        setHasCommissionConsent(fullConsent);
      } catch (error) {
        console.error('Error loading consent status:', error);
        setHasConsent(false);
        setHasCommissionConsent(false);
      }
    }
    loadConsentStatus();
  }, [user, property]);

  // Load favorite status
  useEffect(() => {
    async function loadFavoriteStatus() {
      if (!user || !property) {
        setIsFavorite(false);
        return;
      }
      try {
        const favorites = await getUserFavorites(user.id);
        const isFav = favorites.some((f: any) => f.property_id === property.id);
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Error loading favorite status:', error);
        setIsFavorite(false);
      }
    }
    loadFavoriteStatus();
  }, [user, property]);

  // Load AI investment evaluation
  useEffect(() => {
    async function loadEvaluation() {
      if (!property) {
        setEvaluation(null);
        return;
      }
      setEvaluationLoading(true);
      try {
        const evalData = await getPropertyEvaluation(property.id);
        setEvaluation(evalData);
      } catch (error) {
        console.error('Error loading evaluation:', error);
        setEvaluation(null);
      } finally {
        setEvaluationLoading(false);
      }
    }
    loadEvaluation();
  }, [property]);

  // Track property view for recommendations algorithm
  useEffect(() => {
    if (!user || !property || isOwner || hasTrackedView.current) return;

    async function trackView() {
      try {
        // Track the view interaction
        await trackInteraction(user!.id, property!.id, 'view', {
          source: 'property_detail',
        });

        hasTrackedView.current = true;

        // Update user preferences in background (non-blocking)
        updateUserPreferences(user!.id).catch((err) => {
          console.error('Error updating user preferences:', err);
        });
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    }

    trackView();

    // Track dwell time when user leaves the page
    return () => {
      if (!hasTrackedView.current) return;

      const dwellTimeSeconds = Math.round((Date.now() - pageLoadTime.current) / 1000);

      // Only track meaningful dwell times (> 3 seconds)
      if (dwellTimeSeconds > 3) {
        // Use sendBeacon for reliable tracking on page unload
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && user && property) {
          // Note: In production, you'd send this to an endpoint
          // For now, we'll just log it
          console.log('Dwell time:', dwellTimeSeconds, 'seconds');
        }
      }
    };
  }, [user, property, isOwner]);

  // Grant consent for this specific property
  const handleGrantConsent = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    if (!property) return;

    setConsentLoading(true);
    try {
      await grantPropertyConsent(user.id, property.id);
      setHasConsent(true);
    } catch (error) {
      console.error('Error granting consent:', error);
      alert('Fehler beim Erteilen der Einwilligung. Bitte versuchen Sie es erneut.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleCommissionConsentAccept = async () => {
    if (!user || !property) return;

    setConsentLoading(true);
    try {
      // Save commission consent
      await upsertConsent({
        user_id: user.id,
        property_id: property.id,
        commission_accepted: true,
        data_sharing_accepted: true,
      });

      // Also save old property consent for backwards compatibility
      await grantPropertyConsent(user.id, property.id);

      setHasCommissionConsent(true);
      setHasConsent(true);
      setIsConsentDialogOpen(false);
    } catch (error) {
      console.error('Error granting commission consent:', error);
      alert('Fehler beim Speichern der Einwilligung. Bitte versuchen Sie es erneut.');
    } finally {
      setConsentLoading(false);
    }
  };

  const handleShowAddress = () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    // Open consent dialog if consent not yet given
    if (!hasCommissionConsent) {
      setIsConsentDialogOpen(true);
    }
  };

  // Handle property deactivation
  const handleDeactivate = async () => {
    if (!property || !isOwner) return;

    if (!confirm('Möchten Sie dieses Inserat wirklich deaktivieren? Es wird nicht mehr in der Übersicht angezeigt.')) {
      return;
    }

    setIsDeactivating(true);
    try {
      await deactivateProperty(property.id);
      router.push('/my-properties');
    } catch (error) {
      console.error('Error deactivating property:', error);
      alert('Fehler beim Deaktivieren des Inserats. Bitte versuchen Sie es erneut.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return '#22C55E';
    if (score >= 70) return '#F59E0B';
    return '#EF4444';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Lade Property...</p>
      </main>
    );
  }

  if (!property) {
    return null;
  }

  // Convert property data to PropertyPreview format
  const propertyPreviewData: PropertyPreviewData = {
    images: property.images || [],
    price: property.price || 0,
    commission_rate: property.commission_rate,
    location: property.location || '',
    address: property.address,
    title: property.title || '',
    type: property.property_type,
    sqm: property.sqm || 0,
    rooms: property.rooms || 0,
    description: property.description || '',
    features: property.features,
    yield: property.yield,
    highlights: property.highlights,
    red_flags: property.red_flags,
    ai_investment_score: property.ai_investment_score,
    require_address_consent: property.require_address_consent,
    evaluation: evaluation ? {
      location_score: evaluation.location_score,
      price_score: evaluation.price_score,
      yield_score: evaluation.yield_score,
      appreciation_score: evaluation.appreciation_score,
      features_score: evaluation.features_score,
      price_per_sqm: evaluation.price_per_sqm,
      estimated_monthly_rent: evaluation.estimated_monthly_rent,
      gross_yield_percentage: evaluation.gross_yield_percentage,
    } : undefined,
    owner: property.owner && !isOwner ? {
      first_name: property.owner.first_name,
      last_name: property.owner.last_name,
      company: property.owner.company,
      avatar_url: property.owner.avatar_url,
    } : undefined,
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Two Column Layout - Full Height */}
      <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Left Column - Property Card with Slideshow */}
        <div className="lg:w-1/2 lg:sticky lg:top-20 lg:h-[calc(100vh-80px)] p-4 lg:p-6">
          <PropertyImageSlideshow
            images={property.images}
            title={property.title}
            className="h-full shadow-xl"
            showCounter={true}
            showProgressBars={true}
            overlay={
              !isOwner && user && (
                <FavoriteButton
                  userId={user.id}
                  propertyId={property.id}
                  isFavorite={isFavorite}
                  onToggle={setIsFavorite}
                  size="lg"
                  variant="overlay"
                  className="absolute top-14 right-4 z-20"
                />
              )
            }
          />
        </div>

        {/* Right Column - Property Details (Scrollable) */}
        <div className="lg:w-1/2 flex flex-col lg:h-[calc(100vh-80px)]">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            {/* Property Preview Component */}
            <PropertyPreview
              data={propertyPreviewData}
              showAddress={Boolean(!(property.require_address_consent ?? false) || hasCommissionConsent || isOwner)}
              onRequestAddress={handleShowAddress}
              showInvestmentScore={!evaluationLoading}
              className="!shadow-none !rounded-none !bg-transparent"
              hasConsent={hasConsent}
              isOwner={Boolean(isOwner)}
              consentLoading={consentLoading}
              isUserLoggedIn={Boolean(user)}
              onGrantConsent={handleGrantConsent}
            />
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 lg:p-8 pt-4">
            {isOwner ? (
              <>
                <button
                  onClick={() => router.push(`/property/${property.id}/edit`)}
                  className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil size={20} />
                  Bearbeiten
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={isDeactivating}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Power size={20} />
                  {isDeactivating ? 'Wird deaktiviert...' : 'Deaktivieren'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleProtectedAction(() => setIsChatModalOpen(true))}
                  className="flex-1 bg-primary text-white font-semibold py-4 px-6 rounded-xl hover:opacity-90 transition-colors"
                >
                  {user ? 'AI-Assistent fragen' : 'Anmelden für AI-Assistent'}
                </button>
                <button
                  onClick={() => handleProtectedAction(() => alert('Makler wird kontaktiert...'))}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-900 font-semibold py-4 px-6 rounded-xl hover:border-gray-400 transition-colors"
                >
                  {user ? 'Makler kontaktieren' : 'Anmelden zum Kontaktieren'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Commission Consent Dialog */}
      <CommissionConsentDialog
        isOpen={isConsentDialogOpen}
        onClose={() => setIsConsentDialogOpen(false)}
        onAccept={handleCommissionConsentAccept}
        commissionRate={property.commission_rate || undefined}
        propertyPrice={property.price}
        propertyTitle={property.title}
      />

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
