'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import type { Property } from '@rendito/database';
import { Header } from '../components/Header';
import { FavoriteButton } from '../components/FavoriteButton';
import { PropertyPreview } from '../components/PropertyPreview';
import { CommissionConsentDialog } from '../components/CommissionConsentDialog';
import { ShareLinkModal } from '../components/ShareLinkModal';
import type { PropertyDocument } from '../create-listing/types';
import { mapToPropertyPreviewData } from '../utils/propertyMapper';
import { PropertyActionButtons } from '../components/PropertyActionButtons';
import { InvestmentScoreBadge, PropertyScoreBadge, PropertyImageSlideshow } from '@rendito/ui';
import { MobileDetailHeader } from '../components/MobileDetailHeader';
// import { PropertyFeedbackModal } from '@rendito/ui'; // Component doesn't exist
import { Heart, Plus } from 'lucide-react';
import { CollapsedThumbnailList } from '../components/CollapsedThumbnailList';
import { PropertyListThumbnail } from '../components/PropertyListThumbnail';
import { trpc } from '@/lib/trpc';
import { useMasterDetailNavigation } from '@/app/hooks/useMasterDetailNavigation';
import { MasterDetailLayout } from '../components/layouts/MasterDetailLayout';
import { SimilarProperties, SimilarProperty } from '../components/SimilarProperties';
import { PageContainer } from '../components/PageContainer';
import { DocumentViewer } from '@/app/components/DocumentViewer';

// Hook to check if screen is mobile (below lg breakpoint)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default function FavoritesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const hasGlobalConsent = profile?.global_address_consent ?? false;
  const router = useRouter();
  const isMobile = useIsMobile();
  const [consentedPropertyIds, setConsentedPropertyIds] = useState<Set<string>>(new Set());
  const [consentLoading, setConsentLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPropertyFeedbackModalOpen, setIsPropertyFeedbackModalOpen] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [hasDocumentAccess, setHasDocumentAccess] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
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
  // Use property.id for URL matching since selectItem uses property.id
  const { selectedItem: selectedFavorite, selectedPropertyId, selectItem, goBack } =
    useMasterDetailNavigation(favorites, '/favorites', (fav) => fav.property?.id || fav.id);

  // Get the actual selected property for use in effects
  const selectedProperty = selectedFavorite?.property;
  const selectedPropertyActualId = selectedProperty?.id;

  // Track last selected ID for visual indication on mobile
  useEffect(() => {
    if (selectedPropertyId) {
      setLastSelectedId(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  // Reset selected document and access state when the ACTUAL displayed property changes
  useEffect(() => {
    setSelectedDocument(null);
    setHasDocumentAccess(false);
  }, [selectedPropertyActualId]);

  // Get utils for cache invalidation
  const utils = trpc.useContext();

  // Helper to show toast
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 4000);
  };

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
      showToast('Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.');
      setIsEvaluating(false);
    },
  });

  // Get or create conversation mutation
  const getOrCreateConversationMutation = trpc.messaging.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      // Navigate to conversation
      router.push(`/messages/${data.conversationId}`);
    },
    onError: (error: any) => {
      // Handle special case: provider invitation sent (expected behavior)
      if (error.data?.code === 'PRECONDITION_FAILED') {
        showToast(error.message);
        return;
      }

      // Handle other errors
      console.error('Error creating conversation:', error);
      showToast('Fehler beim Starten der Konversation. Bitte versuchen Sie es erneut.');
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = trpc.properties.submitFeedback.useMutation({
    onSuccess: () => {
      setIsPropertyFeedbackModalOpen(false);
      showToast('✅ Vielen Dank für Ihr Feedback! Der Verkäufer wird es erhalten.');
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      showToast('❌ Fehler beim Absenden des Feedbacks. Bitte versuchen Sie es erneut.');
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

  // User Property Parameters - Query für die aktuell ausgewählte Property
  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId: selectedProperty?.id || '' },
    {
      enabled: !!selectedProperty?.id && !!user,
    }
  );

  // User Property Parameters - Mutation zum Speichern
  const saveUserPropertyParamsMutation = trpc.userPropertyParameters.upsert.useMutation({
    onSuccess: () => {
      // Invalidate query to refresh data
      utils.userPropertyParameters.get.invalidate({ propertyId: selectedProperty?.id || '' });
    },
    onError: (error) => {
      console.error('Error saving user property parameters:', error);
      showToast('Fehler beim Speichern der Parameter. Bitte versuchen Sie es erneut.');
    },
  });

  // Fetch similar properties when a property is selected
  const { data: similarPropertiesData, isLoading: similarPropertiesLoading } =
    trpc.properties.getSimilarPropertiesForDetail.useQuery(
      {
        propertyId: selectedProperty?.id || '',
        sqm: selectedProperty?.sqm,
        location: selectedProperty?.location,
        price: selectedProperty?.price,
        limit: 3,
      },
      {
        enabled: !!selectedProperty,
        refetchOnWindowFocus: false,
      }
    );

  const similarProperties = (similarPropertiesData || []) as SimilarProperty[];

  // Handler for saving user property parameters
  const handleSaveUserPropertyParams = (params: {
    equityPercentage?: number | null;
    interestRate?: number | null;
    amortizationRate?: number | null;
    brokerCommission?: number | null;
    monthlyRent?: number | null;
    monthlyFee?: number | null;
    purchasePrice?: number | null;
    renovationCosts?: number | null;
  }) => {
    if (!selectedProperty?.id) return;
    saveUserPropertyParamsMutation.mutate({
      propertyId: selectedProperty.id,
      ...params,
    });
  };

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

  // Handler for lock icon click - opens consent dialog
  const handleRequestDocumentAccess = () => {
    if (!user) {
      router.push('/auth/login?redirectTo=/favorites');
      return;
    }
    setIsConsentDialogOpen(true);
  };

  // Handler for consent dialog accept
  const handleConsentAccept = async () => {
    if (!selectedProperty) return;
    setConsentLoading(true);
    try {
      await grantConsentMutation.mutateAsync({ propertyId: selectedProperty.id });
      setHasDocumentAccess(true);
      setIsConsentDialogOpen(false);
    } catch (error) {
      console.error('Error granting consent:', error);
    }
    setConsentLoading(false);
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

  const handleEdit = () => {
    if (!selectedProperty) return;

    // Externe/importierte Properties → import-listing mit ID
    // Normale Portfolio Properties → portfolio edit
    if ((selectedProperty as any).is_external) {
      router.push(`/import-listing?id=${selectedProperty.id}`);
    } else {
      router.push(`/portfolio/${selectedProperty.id}/edit`);
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


  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-gray-500 dark:text-gray-400">Lade Favoriten...</p>
        </div>
      </main>
    );
  }

  // Convert property data to PropertyPreview format using central mapper
  const propertyPreviewData = selectedProperty
    ? mapToPropertyPreviewData(selectedProperty as any, { isOwner: false })
    : null;

  return (
    <main className="min-h-screen bg-white dark:bg-[#030712]">
      <Header />

      {/* Action Buttons - reused in mobile and desktop */}
      {(() => {
        const ActionButtons = selectedProperty ? (
          <PropertyActionButtons
            isOwner={false}
            isFavorite={true}
            onToggleFavorite={() => handleRemoveFavorite(selectedProperty.id)}
            onDismiss={handleDismiss}
            onStartMessage={handleStartMessage}
            onOpenFeedback={() => setIsPropertyFeedbackModalOpen(true)}
            isDismissLoading={dismissMutation.isLoading}
            isMessageLoading={getOrCreateConversationMutation.isLoading}
            favoriteButtonLabel="Favorit"
            propertyUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/property/${selectedProperty.id}`}
            isImported={(selectedProperty as any).is_external || false}
            onEdit={handleEdit}
          />
        ) : null;

        return (
          <MasterDetailLayout
            storageKey="favorites"
            hasItems={favorites.length > 0}
            showDetail={!!selectedPropertyId}
            emptyState={
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart size={48} className="text-gray-300 dark:text-gray-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  Noch keine Favoriten
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
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
            }
            mobileHeader={
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Favoriten</h1>
                  <Link href="/import-listing">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                      <Plus size={16} />
                      <span>Importieren</span>
                    </button>
                  </Link>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{favorites.length} gespeicherte Immobilien</p>
              </div>
            }
            desktopHeader={
              <>
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Favoriten</h1>
                  <Link href="/import-listing">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                      <Plus size={16} />
                      <span>Importieren</span>
                    </button>
                  </Link>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{favorites.length} gespeicherte Immobilien</p>
              </>
            }
            collapsedContent={
              <CollapsedThumbnailList
                items={favorites
                  .filter((f) => f.property)
                  .map((f) => ({
                    id: f.property!.id,
                    title: f.property!.title,
                    image: f.property!.images?.[0],
                    propertyType: f.property!.property_type || undefined,
                  }))}
                selectedId={selectedPropertyId || lastSelectedId}
                onSelect={selectItem}
                actionButton={{
                  href: '/import-listing',
                  title: 'Immobilie importieren',
                }}
              />
            }
            masterContent={
              <div className="space-y-3">
                {favorites.map((favorite) => {
                  const property = favorite.property;
                  if (!property) return null;

                  const isSelected = property.id === selectedPropertyId ||
                                   (!selectedPropertyId && property.id === lastSelectedId);

                  return (
                    <PropertyListThumbnail
                      key={favorite.id}
                      id={property.id}
                      title={property.title}
                      isSelected={isSelected}
                      onClick={() => selectItem(property.id)}
                      image={property.images?.[0]}
                      videoUrl={property.video_url || undefined}
                      propertyType={property.property_type || undefined}
                      price={property.price}
                      location={property.location}
                      postalCode={(property as any).postal_code}
                      rooms={property.rooms}
                      sqm={property.sqm}
                      aiScore={property.ai_score || undefined}
                      isImported={(property as any).is_external || false}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(property.id);
                      }}
                      deleteTooltip="Favorit entfernen"
                    />
                  );
                })}
              </div>
            }
            detailContent={
              selectedProperty ? (
                <>
                  {/* Mobile Header */}
                  {selectedPropertyId && (
                    <MobileDetailHeader
                      title="Zurück"
                      subtitle=""
                      onBack={goBack}
                    />
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-stretch p-4 lg:p-8 lg:h-[80vh] relative">
                    {/* Left Column - Property Details */}
                    <div className="w-full lg:w-1/2 lg:pr-6 order-2 lg:order-1 flex flex-col lg:h-full">
                      {/* Scrollable PropertyPreview - Full height on mobile, 80vh on md+ */}
                      <div className="overflow-y-auto lg:h-full mb-4">
                        {propertyPreviewData && (
                          <PropertyPreview
                            key={selectedProperty.id}
                            data={propertyPreviewData}
                            showAddress={true}
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
                            onDocumentSelect={setSelectedDocument}
                            onRequestDocumentAccess={handleRequestDocumentAccess}
                            hasDocumentAccess={hasDocumentAccess}
                            hasManualApproval={hasDocumentAccess}
                            userPropertyParams={userPropertyParams}
                            onSaveUserPropertyParams={handleSaveUserPropertyParams}
                            isSavingUserPropertyParams={saveUserPropertyParamsMutation.isLoading}
                            isMobile={isMobile}
                          />
                        )}
                      </div>

                      {/* Action Buttons - Below on mobile, fixed on md+ */}
                      <div className="md:mt-auto">
                        {ActionButtons}
                      </div>
                    </div>

                    {/* Right Column - Images or Document Viewer */}
                    <div className="w-full lg:w-1/2 h-[50vh] lg:h-full lg:pl-6 order-1 lg:order-2 mb-4 lg:mb-0">
                      <div className="h-full rounded-2xl overflow-hidden">
                        {selectedDocument && !isMobile ? (
                          <DocumentViewer
                            document={selectedDocument}
                            onClose={() => setSelectedDocument(null)}
                          />
                        ) : (
                          <PropertyImageSlideshow
                            images={selectedProperty.images || []}
                            videoUrl={selectedProperty.video_url || undefined}
                            title={selectedProperty.title}
                            className="h-full"
                            showCounter={true}
                            showProgressBars={true}
                            slideshowId={`favorites-${selectedProperty.id}`}
                            propertyType={selectedProperty.property_type || undefined}
                            overlay={
                              <>
                                {/* AI Score Badge - Ring Variant */}
                                {selectedProperty.ai_score && selectedProperty.ai_score > 0 && (
                                  <div className="absolute top-8 right-4 z-10 pointer-events-none">
                                    <PropertyScoreBadge score={selectedProperty.ai_score} variant="ring" />
                                  </div>
                                )}
                              </>
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Gradient fade to indicate more content below - Desktop only */}
                    <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-24 pointer-events-none bg-gradient-to-b from-transparent to-white dark:to-[#030712] opacity-60" />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  Wählen Sie einen Favoriten aus der Liste
                </div>
              )
            }
          />
        );
      })()}

      {/* Similar Properties - Full Width */}
      {/* Only show on mobile when in detail view (selectedPropertyId exists), always show on desktop */}
      {selectedProperty && (similarProperties.length > 0 || similarPropertiesLoading) && (!isMobile || selectedPropertyId) && (
        <div className="bg-gray-50 dark:bg-gray-900/50 py-12 lg:mt-0 mt-8">
          <PageContainer>
            <SimilarProperties
              title="Ähnliche Objekte"
              subtitle="Basierend auf Standort, Größe und Preis"
              properties={similarProperties}
              badgeContext="ai-score"
              isLoading={similarPropertiesLoading}
              linkBuilder={(id) => `/property/${id}`}
              fullWidth
              emptyMessage="Keine ähnlichen Objekte gefunden"
            />
          </PageContainer>
        </div>
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

      {/* Commission Consent Dialog */}
      {selectedProperty && (
        <CommissionConsentDialog
          isOpen={isConsentDialogOpen}
          onClose={() => setIsConsentDialogOpen(false)}
          onAccept={handleConsentAccept}
          commissionRate={selectedProperty.commission_rate || undefined}
          propertyPrice={selectedProperty.price}
        />
      )}

      {/* Share Link Modal */}
      {selectedProperty && (
        <ShareLinkModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          propertyId={selectedProperty.id}
          propertyTitle={selectedProperty.title}
          documentsCount={((selectedProperty as any).documents || []).length}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-lg shadow-lg animate-fade-in max-w-md text-center">
          {toastMessage}
        </div>
      )}
    </main>
  );
}
