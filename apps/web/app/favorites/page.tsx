'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { FavoriteButton } from '../components/FavoriteButton';
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { PropertyActionButtons } from '../components/PropertyActionButtons';
import { InvestmentScoreBadge } from '@immoflow/ui';
// import { PropertyFeedbackModal } from '@immoflow/ui'; // Component doesn't exist
import { MapPin, Home, Heart, X, Plus } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useMasterDetailNavigation } from '@/app/hooks/useMasterDetailNavigation';
import { MobileDetailHeader } from '../components/MobileDetailHeader';

export default function FavoritesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const router = useRouter();
  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const [consentLoading, setConsentLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPropertyFeedbackModalOpen, setIsPropertyFeedbackModalOpen] = useState(false);
  const hasCheckedAuth = useRef(false);

  // Performance tracking
  const pageLoadStartTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const pageLoadLoggedRef = useRef(false);

  renderCountRef.current += 1;

  // Fetch favorites with tRPC
  const { data: favorites = [], isLoading: loading, refetch } = trpc.favorites.getAll.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
    onSuccess: () => {
      const duration = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-FAV] Favorites loaded in ${duration.toFixed(2)}ms`);
    },
  });

  // Mobile master-detail navigation
  const { selectedItem: selectedFavorite, selectedPropertyId, selectItem, goBack } =
    useMasterDetailNavigation(favorites, '/favorites');

  // Get utils for cache invalidation
  const utils = trpc.useContext();

  // Remove favorite mutation
  const removeFavoriteMutation = trpc.favorites.remove.useMutation({
    onSuccess: () => {
      utils.favorites.getAll.invalidate();
    },
  });

  // Evaluation mutation
  const evaluateMutation = trpc.evaluations.generateInvestmentEvaluation.useMutation({
    onSuccess: () => {
      // Invalidate and refetch favorites to get updated AI evaluation
      utils.favorites.getAll.invalidate();
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

  // Dismiss mutation
  const dismissMutation = trpc.dismissed.dismiss.useMutation({
    onSuccess: () => {
      // Remove from favorites after dismissing
      if (selectedProperty) {
        handleRemoveFavorite(selectedProperty.id);
      }
    },
  });

  // Log page fully loaded
  useEffect(() => {
    if (!loading && !authLoading && !pageLoadLoggedRef.current) {
      const pageLoadTime = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-FAV] Page fully loaded in ${pageLoadTime.toFixed(2)}ms (${(pageLoadTime / 1000).toFixed(2)}s)`);
      console.log(`📄 [PERF-FAV] Total renders: ${renderCountRef.current}`);
      pageLoadLoggedRef.current = true;
    }
  }, [loading, authLoading]);

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

  // Helper to check if address should be shown for a property
  const shouldShowAddress = (propertyId: string) => {
    return hasGlobalConsent || consentedPropertyIds.has(propertyId);
  };

  const handleRemoveFavorite = async (propertyId: string) => {
    if (!user) return;

    try {
      await removeFavoriteMutation.mutateAsync({ propertyId });
      // Hook will automatically select first item after refresh
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Consent mutation
  const grantConsentMutation = trpc.consents.grantPropertyConsent.useMutation({
    onSuccess: (_, variables) => {
      setConsentedPropertyIds(prev => new Set([...prev, variables.propertyId]));
      setConsentLoading(false);
    },
    onError: (error) => {
      console.error('Error granting consent:', error);
      setConsentLoading(false);
    },
  });

  const handleGrantConsent = async (propertyId: string) => {
    if (!user) return;

    setConsentLoading(true);
    try {
      await grantConsentMutation.mutateAsync({ propertyId });
    } catch (error) {
      console.error('Error granting consent:', error);
    }
  };

  const handleTriggerEvaluation = async (viewType?: 'seller' | 'buyer_selfuse' | 'buyer_investor') => {
    if (!selectedProperty || isEvaluating) return;

    setIsEvaluating(true);
    try {
      // For buyer mode, use the investment evaluation
      await evaluateMutation.mutateAsync({ propertyId: selectedProperty.id });
    } catch (error) {
      console.error('Error triggering evaluation:', error);
      setIsEvaluating(false);
    }
  };

  const handleStartMessage = async () => {
    if (!user || !selectedProperty) return;

    // Start conversation
    getOrCreateConversationMutation.mutate({ propertyId: selectedProperty.id });
  };

  const handleDismiss = async () => {
    if (!user || !selectedProperty) return;

    // Dismiss the property
    dismissMutation.mutate({ propertyId: selectedProperty.id });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
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

  const selectedProperty = selectedFavorite?.property;

  // Convert property data to PropertyPreview format
  // Extract detailed evaluation data from JSONB field
  const detailedEval = selectedProperty?.ai_detailed_evaluation as any;

  const propertyPreviewData: PropertyPreviewData | null = selectedProperty ? {
    images: selectedProperty.images || [],
    price: selectedProperty.price || 0,
    commission_rate: selectedProperty.commission_rate ?? undefined,
    location: selectedProperty.location || '',
    address: selectedProperty.address ?? undefined,
    title: selectedProperty.title || '',
    type: selectedProperty.property_type ?? undefined,
    sqm: selectedProperty.sqm || 0,
    rooms: selectedProperty.rooms || 0,
    description: selectedProperty.description || '',
    features: selectedProperty.features ?? undefined,
    yield: selectedProperty.yield ?? undefined,
    highlights: selectedProperty.highlights ?? undefined,
    red_flags: selectedProperty.red_flags ?? undefined,
    ai_investment_score: selectedProperty.ai_score ?? undefined,
    require_address_consent: selectedProperty.require_address_consent ?? undefined,
    monthly_fee: selectedProperty.monthly_fee ?? undefined,
    usable_area: selectedProperty.usable_area ?? undefined,
    usable_area_ratio: selectedProperty.usable_area_ratio ?? undefined,
    bathrooms: selectedProperty.bathrooms ?? undefined,
    total_floors: selectedProperty.total_floors ?? undefined,
    floor_level: selectedProperty.floor_level ?? undefined,
    available_from: selectedProperty.available_from ?? undefined,
    year_built: selectedProperty.year_built ?? undefined,
    heating_type: selectedProperty.heating_type ?? undefined,
    energy_source: selectedProperty.energy_source ?? undefined,
    energy_certificate: selectedProperty.energy_certificate ?? undefined,
    energy_efficiency_class: selectedProperty.energy_efficiency_class ?? undefined,
    condition: selectedProperty.condition ?? undefined,
    important_notes: selectedProperty.important_notes ?? undefined,
    // Extract AI analysis data from ai_detailed_evaluation JSONB
    yield_metrics: detailedEval?.yield_metrics ?? undefined,
    rental_income: detailedEval?.rental_income ?? undefined,
    cashflow_calculation: detailedEval?.cashflow_calculation ?? undefined,
    evaluation: detailedEval?.evaluation ?? undefined,
    // AI Rating fields
    ai_rating_explanation: selectedProperty.ai_rating_explanation ?? undefined,
    strengths: selectedProperty.strengths ?? undefined,
    weaknesses: selectedProperty.weaknesses ?? undefined,
    opportunities: selectedProperty.opportunities ?? undefined,
    risks: selectedProperty.risks ?? undefined,
    owner: selectedProperty.owner && (
      selectedProperty.owner.first_name ||
      selectedProperty.owner.last_name ||
      selectedProperty.owner.company
    ) ? {
      first_name: selectedProperty.owner.first_name,
      last_name: selectedProperty.owner.last_name,
      company: selectedProperty.owner.company,
      avatar_url: selectedProperty.owner.avatar_url,
    } : undefined,
    // Buyer evaluation from JSONB field
    buyer_evaluation: selectedProperty.buyer_evaluation as any ?? undefined,
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
              Speichern Sie Immobilien, die Ihnen gefallen, oder importieren Sie Inserate von anderen Portalen
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/">
                <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity">
                  Immobilien entdecken
                </button>
              </Link>
              <Link href="/import-listing">
                <button className="bg-white text-primary border-2 border-primary px-6 py-3 rounded-xl font-medium hover:bg-primary/5 transition-colors flex items-center gap-2">
                  <Plus size={20} />
                  Inserat importieren
                </button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Header - Only visible on small screens when no detail is shown */}
          <div className={`${selectedPropertyId ? 'hidden' : 'block'} lg:hidden bg-white border-b border-gray-200 p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Meine Favoriten</h1>
                <p className="text-gray-500 text-sm">{favorites.length} gespeicherte Immobilien</p>
              </div>
              <Link href="/import-listing">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={16} />
                  <span>Importieren</span>
                </button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row" style={{ height: 'calc(100vh - 100px)' }}>
            {/* Left Column - Favorites List */}
            <div className={`${selectedPropertyId ? 'hidden' : 'block'} lg:block lg:w-1/4 border-r border-gray-200 overflow-y-auto`}>
              <div className="p-4">
                {/* Desktop Header - Hidden on mobile */}
                <div className="hidden lg:flex items-center justify-between mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">Meine Favoriten</h1>
                  <Link href="/import-listing">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                      <Plus size={16} />
                      <span>Importieren</span>
                    </button>
                  </Link>
                </div>
                <p className="hidden lg:block text-gray-500 text-sm mb-4">{favorites.length} gespeicherte Immobilien</p>

              <div className="space-y-3">
                {favorites.map((favorite, index) => {
                  const property = favorite.property;
                  if (!property) return null;

                  const isSelected = property.id === selectedPropertyId;

                  return (
                    <div
                      key={favorite.id}
                      className={`group relative bg-white border rounded-xl overflow-hidden transition-all h-32 ${
                        isSelected
                          ? 'border-primary shadow-md ring-2 ring-primary/20'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Remove Button (X) - Always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(property.id);
                        }}
                        className="absolute top-2 right-2 z-20 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                        title="Favorit entfernen"
                      >
                        <X size={14} />
                      </button>

                      <div className="flex h-full cursor-pointer" onClick={() => selectItem(property.id)}>
                        {/* Thumbnail - Full height */}
                        <div className="relative w-28 flex-shrink-0 bg-gray-100">
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
                          {property.ai_score && property.ai_score > 0 && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/75 shadow-md">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: property.ai_score >= 70 ? '#22C55E' : property.ai_score >= 40 ? '#F59E0B' : '#EF4444'
                                }}
                              />
                              <span className="text-white text-xs font-semibold">{property.ai_score}</span>
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
          <div className={`${selectedPropertyId ? 'block' : 'hidden'} lg:block lg:w-3/4 flex flex-col`} style={{ height: 'calc(100vh - 100px)' }}>
            {selectedProperty ? (
              <>
                {/* Mobile Detail Header - Only shown on mobile when detail is open */}
                {selectedPropertyId && (
                  <MobileDetailHeader
                    title="Zurück"
                    subtitle=""
                    onBack={goBack}
                  />
                )}

                <div className="flex flex-col-reverse lg:flex-row flex-1">
                  {/* Left - Property Details (Scrollable) */}
                  <div className="w-full lg:w-1/2 flex flex-col lg:h-full">
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-48 lg:pb-8">
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
                        showEvaluationButton={!selectedProperty.ai_score || selectedProperty.ai_score === 0}
                        onTriggerEvaluation={handleTriggerEvaluation}
                        isGeneratingEvaluation={isEvaluating}
                        evaluationViewType="buyer"
                        propertyId={selectedProperty.id}
                      />
                    )}
                  </div>

                  {/* Bottom Bar */}
                  <div className="w-full mb-20 lg:mb-0">
                    <PropertyActionButtons
                      isOwner={false}
                      isFavorite={true}
                      onToggleFavorite={() => handleRemoveFavorite(selectedProperty.id)}
                      onDismiss={handleDismiss}
                      onStartMessage={handleStartMessage}
                      onOpenFeedback={() => setIsPropertyFeedbackModalOpen(true)}
                      isDismissLoading={dismissMutation.isLoading}
                      isMessageLoading={getOrCreateConversationMutation.isLoading}
                      favoriteButtonLabel="Favorit entfernen"
                    />
                  </div>
                </div>

                  {/* Right - Image Slideshow */}
                  <div className="w-full lg:w-1/2 lg:sticky lg:top-0 h-[60vh] lg:h-[calc(100vh-100px)] p-4 lg:p-6">
                    <PropertyImageSlideshow
                      images={selectedProperty.images}
                      title={selectedProperty.title}
                      className="h-full shadow-xl"
                      showCounter={true}
                      showProgressBars={true}
                      slideshowId={`favorites-${selectedProperty.id}`}
                    />
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
        </>
      )}

      {/* Property Feedback Modal */}
      {/* {selectedProperty && (
        <PropertyFeedbackModal
          isOpen={isPropertyFeedbackModalOpen}
          onClose={() => setIsPropertyFeedbackModalOpen(false)}
          onSubmit={async (feedbackData) => {
            await submitFeedbackMutation.mutateAsync({
              propertyId: selectedProperty.id,
              ...feedbackData,
            });
          }}
          propertyTitle={selectedProperty.title}
        />
      )} */}
      {/* TODO: PropertyFeedbackModal component doesn't exist - need to create or remove this feature */}
    </main>
  );
}
