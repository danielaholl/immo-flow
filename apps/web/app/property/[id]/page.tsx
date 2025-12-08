'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AIInvestmentEvaluation, PropertyFeedbackModal } from '@immoflow/ui';
import { Pencil, Power, Heart, X, MessageSquare } from 'lucide-react';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { PropertyImageSlideshow } from '@/app/components/PropertyImageSlideshow';
import { FavoriteButton } from '@/app/components/FavoriteButton';
import { CommissionConsentDialog } from '@/app/components/CommissionConsentDialog';
import { PropertyPreview, PropertyPreviewData } from '@/app/components/PropertyPreview';
import { InvestmentScoreBadge } from '@/app/components/InvestmentScoreBadge';
import { trpc } from '@/lib/trpc';

export default function PropertyPage() {
  // Performance tracking
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const pageLoadStartTimeRef = useRef(performance.now());

  if (renderCountRef.current === 1) {
    console.log('📄 [PERF-DETAIL] PropertyPage: Initial render');
  }

  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const [hasConsent, setHasConsent] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [hasCommissionConsent, setHasCommissionConsent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPropertyFeedbackModalOpen, setIsPropertyFeedbackModalOpen] = useState(false);

  // Fetch property with owner using tRPC
  const { data: property, isLoading: loading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: params.id as string },
    {
      enabled: !!params.id,
      onSuccess: () => {
        const duration = performance.now() - pageLoadStartTimeRef.current;
        console.log(`📄 [PERF-DETAIL] Property loaded in ${duration.toFixed(2)}ms`);
      },
      onError: () => {
        router.push('/');
      },
    }
  );

  // Fetch favorite status
  const { data: isFavoriteData } = trpc.favorites.isFavorite.useQuery(
    { propertyId: params.id as string },
    { enabled: !!user && !!params.id }
  );
  const isFavorite = isFavoriteData?.isFavorite ?? false;

  // Fetch AI evaluation
  const { data: aiEvaluation } = trpc.evaluations.getAIEvaluation.useQuery(
    { propertyId: params.id as string },
    { enabled: !!params.id }
  );

  // Get tRPC utils for cache invalidation
  const utils = trpc.useContext();

  // Mutations for favorites
  const addFavoriteMutation = trpc.favorites.add.useMutation({
    onSuccess: () => {
      utils.favorites.isFavorite.invalidate();
    },
  });

  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.isFavorite.invalidate();
    },
  });

  // Mutations for dismissed properties
  const dismissMutation = trpc.dismissed.dismiss.useMutation({
    onSuccess: () => {
      // Redirect to home page after dismissing
      router.push('/');
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = trpc.properties.submitFeedback.useMutation({
    onSuccess: () => {
      setIsPropertyFeedbackModalOpen(false);
      alert('✅ Vielen Dank für Ihr Feedback! Der Verkäufer wird es erhalten.');
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      alert('❌ Fehler beim Absenden des Feedbacks. Bitte versuchen Sie es erneut.');
    },
  });

  // Deactivate mutation
  const deactivateMutation = trpc.properties.deactivate.useMutation({
    onSuccess: () => {
      router.push('/my-properties');
    },
    onError: (error) => {
      console.error('Error deactivating property:', error);
      alert('Fehler beim Deaktivieren des Inserats. Bitte versuchen Sie es erneut.');
    },
  });

  // Evaluation mutation
  const evaluateMutation = trpc.evaluations.generateInvestmentEvaluation.useMutation({
    onSuccess: () => {
      // Invalidate and refetch AI evaluation
      utils.evaluations.getAIEvaluation.invalidate();
      setIsEvaluating(false);
    },
    onError: (error) => {
      console.error('Error evaluating property:', error);
      alert('Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.');
      setIsEvaluating(false);
    },
  });

  // Get or create conversation mutation
  const getOrCreateConversationMutation = trpc.messaging.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      // Navigate to conversation
      router.push(`/messages/${data.conversationId}`);
    },
    onError: (error) => {
      console.error('Error creating conversation:', error);
      alert('Fehler beim Starten der Konversation. Bitte versuchen Sie es erneut.');
    },
  });

  // Check if current user is the owner of this property
  const isOwner = user && property && property.user_id === user.id;

  const handleProtectedAction = (action: () => void) => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }
    action();
  };

  // Mutations for consent
  const grantConsentMutation = trpc.consents.grantPropertyConsent.useMutation({
    onSuccess: () => {
      setHasConsent(true);
      setConsentLoading(false);
    },
    onError: (error) => {
      console.error('Error granting consent:', error);
      setConsentLoading(false);
    },
  });

  // Grant consent for this specific property
  const handleGrantConsent = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    if (!property) return;

    setConsentLoading(true);
    try {
      await grantConsentMutation.mutateAsync({ propertyId: property.id });
    } catch (error) {
      console.error('Error granting consent:', error);
    }
  };

  const handleCommissionConsentAccept = async () => {
    if (!user || !property) return;

    setConsentLoading(true);
    try {
      await grantConsentMutation.mutateAsync({ propertyId: property.id });
      setHasCommissionConsent(true);
      setHasConsent(true);
      setIsConsentDialogOpen(false);
    } catch (error) {
      console.error('Error granting consent:', error);
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

  const handleToggleFavorite = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    // Toggle favorite using add/remove mutations
    if (isFavorite) {
      removeFavoriteMutation.mutate({ propertyId: params.id as string });
    } else {
      addFavoriteMutation.mutate({ propertyId: params.id as string });
    }
  };

  const handleDismiss = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    // Dismiss the property
    dismissMutation.mutate({ propertyId: params.id as string });
  };

  const handleStartMessage = async () => {
    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    // Start conversation
    getOrCreateConversationMutation.mutate({ propertyId: params.id as string });
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      router.push(`/auth/login?redirectTo=/property/${params.id}`);
      return;
    }

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync({ propertyId: property.id });
      } else {
        await addFavoriteMutation.mutateAsync({ propertyId: property.id });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleTriggerEvaluation = async () => {
    // Guard: prevent double-clicking and concurrent evaluations
    if (!property || isEvaluating) return;

    setIsEvaluating(true);
    try {
      await evaluateMutation.mutateAsync({ propertyId: property.id });
    } catch (error) {
      console.error('Error triggering evaluation:', error);
      // Reset state on error
      setIsEvaluating(false);
    }
  };

  // Handle property deactivation
  const handleDeactivate = async () => {
    if (!property || !isOwner) return;

    if (!confirm('Möchten Sie dieses Inserat wirklich deaktivieren? Es wird nicht mehr in der Übersicht angezeigt.')) {
      return;
    }

    deactivateMutation.mutate({ id: property.id });
  };

  // Track when page is fully loaded
  const pageLoadLoggedRef = useRef(false);
  useEffect(() => {
    if (!loading && property && !pageLoadLoggedRef.current) {
      const pageLoadTime = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-DETAIL] Page fully loaded in ${pageLoadTime.toFixed(2)}ms (${(pageLoadTime / 1000).toFixed(2)}s)`);
      console.log(`📄 [PERF-DETAIL] Total renders: ${renderCountRef.current}`);
      pageLoadLoggedRef.current = true;
    }
  }, [loading, property]);

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
  // Extract detailed evaluation data from JSONB field
  const detailedEval = property.ai_detailed_evaluation as any;

  const propertyPreviewData: PropertyPreviewData = {
    images: property.images || [],
    price: property.price || 0,
    commission_rate: property.commission_rate ?? undefined,
    location: property.location || '',
    address: property.address ?? undefined,
    title: property.title || '',
    type: property.property_type ?? undefined,
    sqm: property.sqm || 0,
    rooms: property.rooms || 0,
    description: property.description || '',
    features: property.features ?? undefined,
    yield: property.yield ?? undefined,
    highlights: property.highlights ?? undefined,
    red_flags: property.red_flags ?? undefined,
    ai_investment_score: property.ai_investment_score ?? property.ai_score ?? undefined,
    require_address_consent: property.require_address_consent ?? undefined,
    // New fields from database migration
    monthly_fee: property.monthly_fee ?? undefined,
    usable_area: property.usable_area ?? undefined,
    usable_area_ratio: property.usable_area_ratio ?? undefined,
    bathrooms: property.bathrooms ?? undefined,
    total_floors: property.total_floors ?? undefined,
    floor_level: property.floor_level ?? undefined,
    available_from: property.available_from ?? undefined,
    year_built: property.year_built ?? undefined,
    heating_type: property.heating_type ?? undefined,
    energy_source: property.energy_source ?? undefined,
    energy_certificate: property.energy_certificate ?? undefined,
    energy_efficiency_class: property.energy_efficiency_class ?? undefined,
    condition: property.condition ?? undefined,
    important_notes: property.important_notes ?? undefined,
    days_online: (property as any).days_online ?? undefined,
    // Extract AI analysis data from ai_detailed_evaluation JSONB
    actual_monthly_rent: property.actual_monthly_rent ?? undefined,
    yield_metrics: detailedEval?.yield_metrics ?? undefined,
    rental_income: detailedEval?.rental_income ?? undefined,
    cashflow_calculation: detailedEval?.cashflow_calculation ?? undefined,
    // Merge evaluation data: prefer aiEvaluation from property_ai_evaluations table, fallback to JSONB
    evaluation: aiEvaluation ? {
      location_score: aiEvaluation.location_score,
      price_score: aiEvaluation.price_score,
      yield_score: aiEvaluation.yield_score,
      appreciation_score: aiEvaluation.appreciation_score,
      features_score: aiEvaluation.features_score,
      price_per_sqm: aiEvaluation.price_per_sqm ?? detailedEval?.evaluation?.price_per_sqm,
      market_average_price_per_sqm: aiEvaluation.market_average_price_per_sqm,
      estimated_monthly_rent: aiEvaluation.estimated_monthly_rent,
      gross_yield_percentage: aiEvaluation.gross_yield_percentage,
      // AI Analysis texts - only from aiEvaluation
      location_analysis: aiEvaluation.location_analysis,
      market_analysis: aiEvaluation.market_analysis,
      rent_analysis: aiEvaluation.rent_analysis,
      financing_analysis: aiEvaluation.financing_analysis,
      // Interest rates
      interest_rate_90: aiEvaluation.interest_rate_90,
      interest_rate_80: aiEvaluation.interest_rate_80,
    } : detailedEval?.evaluation ?? undefined,
    ai_recommendation: detailedEval?.ai_recommendation ?? undefined,
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
              <>
                {/* AI-Score Badge - Top Right (Same as PropertyCard) */}
                {(() => {
                  const aiScore = property.ai_investment_score ?? property.ai_score;

                  if (!aiScore) return null;

                  // Get badge info based on score (same logic as PropertyCard)
                  let badgeInfo: { label: string; color: string; dotColor: string };

                  if (aiScore >= 75) {
                    badgeInfo = {
                      label: 'Top Deal',
                      color: '#22C55E',
                      dotColor: '#22C55E',
                    };
                  } else if (aiScore >= 50) {
                    badgeInfo = {
                      label: 'Prüfen',
                      color: '#F59E0B',
                      dotColor: '#F59E0B',
                    };
                  } else {
                    badgeInfo = {
                      label: 'Finger weg',
                      color: '#EF4444',
                      dotColor: '#EF4444',
                    };
                  }

                  return (
                    <div
                      className="absolute top-14 right-6 z-20 flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        borderWidth: '1px',
                        borderColor: badgeInfo.color,
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: badgeInfo.dotColor }}
                      />
                      <div>
                        <div
                          className="text-[13px] font-bold leading-tight mb-0.5"
                          style={{ color: badgeInfo.color }}
                        >
                          {badgeInfo.label}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">
                          {aiScore}/100
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Buttons - Bottom Right */}
                {!isOwner && (
                  <div className="absolute bottom-6 right-4 z-20 flex flex-row gap-3">
                    <button
                      onClick={() => router.push('/')}
                      className="w-12 h-12 rounded-full flex items-center justify-center border hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        borderColor: 'rgba(239, 68, 68, 0.6)'
                      }}
                    >
                      <span className="text-2xl text-red-500">✕</span>
                    </button>
                    {user && (
                      <button
                        onClick={handleFavoriteToggle}
                        className="w-12 h-12 rounded-full flex items-center justify-center border hover:scale-105 transition-transform"
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          borderColor: 'rgba(16, 185, 129, 0.6)'
                        }}
                      >
                        <Heart
                          size={24}
                          color="#10B981"
                          fill={isFavorite ? '#10B981' : 'none'}
                          strokeWidth={2}
                        />
                      </button>
                    )}
                  </div>
                )}
              </>
            }
          />
        </div>

        {/* Right Column - Property Details (Scrollable) */}
        <div className="lg:w-1/2 flex flex-col lg:h-[calc(100vh-80px)]">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto py-4 lg:py-8">
            {/* Property Preview Component */}
            <PropertyPreview
              data={propertyPreviewData}
              showAddress={Boolean(!(property.require_address_consent ?? false) || hasCommissionConsent || isOwner)}
              onRequestAddress={handleShowAddress}
              showInvestmentScore={true}
              isGeneratingEvaluation={isEvaluating}
              className="!shadow-none !rounded-none !bg-transparent"
              hasConsent={hasConsent}
              isOwner={Boolean(isOwner)}
              consentLoading={consentLoading}
              isUserLoggedIn={Boolean(user)}
              onGrantConsent={handleGrantConsent}
              showConsentSection={false}
              propertyId={property.id}
              onTriggerEvaluation={handleTriggerEvaluation}
              showEvaluationButton={true}
              showCTAs={false}
              onAddToFavorites={handleToggleFavorite}
              isFavorite={isFavorite}
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
                  disabled={deactivateMutation.isLoading}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deactivateMutation.isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Wird deaktiviert...
                    </>
                  ) : (
                    <>
                      <Power size={20} />
                      Deaktivieren
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleFavorite}
                  className={`flex-1 font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 ${
                    isFavorite
                      ? 'bg-primary text-white hover:opacity-90'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
                  {isFavorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
                </button>
                <button
                  onClick={handleStartMessage}
                  disabled={getOrCreateConversationMutation.isLoading}
                  className="flex-1 bg-green-600 text-white font-semibold py-4 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getOrCreateConversationMutation.isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Wird gestartet...
                    </>
                  ) : (
                    <>
                      <MessageSquare size={20} />
                      Nachricht senden
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  disabled={dismissMutation.isLoading}
                  className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {dismissMutation.isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      Wird verarbeitet...
                    </>
                  ) : (
                    <>
                      <X size={20} />
                      Kein Interesse
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsPropertyFeedbackModalOpen(true)}
                  className="flex-1 bg-white border-2 border-blue-300 text-blue-700 font-semibold py-4 px-6 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={20} />
                  Feedback geben
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

      {/* Property Feedback Modal */}
      <PropertyFeedbackModal
        isOpen={isPropertyFeedbackModalOpen}
        onClose={() => setIsPropertyFeedbackModalOpen(false)}
        onSubmit={async (feedbackData) => {
          await submitFeedbackMutation.mutateAsync({
            propertyId: property.id,
            ...feedbackData,
          });
        }}
        propertyTitle={property.title}
      />

      {/* Contact Success Toast */}
      {showContactSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-up">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold">Anfrage gesendet!</p>
            <p className="text-sm text-green-100">Der Makler wird sich bei Ihnen melden.</p>
          </div>
        </div>
      )}
    </main>
  );
}
