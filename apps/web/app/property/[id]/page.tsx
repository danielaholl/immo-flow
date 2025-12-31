'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// UUID validation helper
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Hook to check if screen is mobile (below lg breakpoint)
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    // Check on mount
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
// import { AIInvestmentEvaluation, PropertyFeedbackModal } from '@rendito/ui'; // Components don't exist
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '@/app/components/Header';
import { PropertyImageSlideshow } from '@/app/components/PropertyImageSlideshow';
import { DocumentViewer } from '@/app/components/DocumentViewer';
import { FavoriteButton } from '@/app/components/FavoriteButton';
import { CommissionConsentDialog } from '@/app/components/CommissionConsentDialog';
import { PropertyPreview } from '@/app/components/PropertyPreview';
import type { PropertyDocument } from '@/app/create-listing/types';
import { mapToPropertyPreviewData } from '@/app/utils/propertyMapper';
import { PropertyActionButtons } from '@/app/components/PropertyActionButtons';
import { ActionButtonPanel } from '@/app/components/ActionButtonPanel';
import { ShareLinkModal } from '@/app/components/ShareLinkModal';
import { MobileDetailHeader } from '@/app/components/MobileDetailHeader';
import { PageContainer } from '@/app/components/PageContainer';
import { ArrowLeft } from 'lucide-react';
import { InvestmentScoreBadge, PropertyScoreBadge, ImageOverlayActions } from '@rendito/ui';
import { trpc } from '@/lib/trpc';
import { useAuthGuard } from '@/app/hooks/useAuthGuard';
import { LoginPromptModal } from '@/app/components/LoginPromptModal';
import { RestrictedContent } from '@/app/components/RestrictedContent';
import { UpgradeModal } from '@/app/components/UpgradeModal';
import { useSubscription } from '@/hooks/useSubscription';

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
  const { canAccess, plan } = useSubscription();
  const isMobile = useIsMobile();
  const [hasConsent, setHasConsent] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [hasCommissionConsent, setHasCommissionConsent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPropertyFeedbackModalOpen, setIsPropertyFeedbackModalOpen] = useState(false);
  const [buyerEvaluation, setBuyerEvaluation] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Initialize auth guard for protected actions
  const {
    guard,
    showLoginModal,
    setShowLoginModal,
  } = useAuthGuard({
    returnUrl: `/property/${params.id}`,
  });

  // Document access state
  const [hasDocumentAccess, setHasDocumentAccess] = useState(false);
  const [hasManualApproval, setHasManualApproval] = useState(false);

  // Validate that the ID is a valid UUID
  const propertyId = params.id as string;
  const isValidPropertyId = Boolean(propertyId && isValidUUID(propertyId));

  // Redirect to home if ID is not a valid UUID
  useEffect(() => {
    if (propertyId && !isValidUUID(propertyId)) {
      router.push('/');
    }
  }, [propertyId, router]);

  // Fetch property with owner using tRPC
  // Uses getByIdWithOwner which includes owner profile data (name, phone, avatar, etc.)
  const { data: property, isLoading: loading } = trpc.properties.getByIdWithOwner.useQuery(
    { id: propertyId },
    {
      enabled: isValidPropertyId,
      onSuccess: (data) => {
        const duration = performance.now() - pageLoadStartTimeRef.current;
        console.log(`📄 [PERF-DETAIL] Property loaded in ${duration.toFixed(2)}ms`);
        console.log('📊 Property data includes buyer_evaluation:', !!data.buyer_evaluation);
        console.log('📊 Property ai_investment_score:', data.ai_investment_score);
      },
      onError: () => {
        router.push('/');
      },
    }
  );

  // Initialize buyer evaluation from property data when it's loaded or updated
  useEffect(() => {
    if (property?.buyer_evaluation) {
      console.log('🔄 Setting buyer evaluation from property:', property.buyer_evaluation);
      setBuyerEvaluation(property.buyer_evaluation);
    }
  }, [property?.buyer_evaluation]);

  // Check if this is teaser mode (non-authenticated user)
  const isTeaserMode = property?.requiresAuth ?? false;

  // Check if current user is the owner of this property (for backend-only checks like pending approvals)
  const isOwner = user && property && property.user_id === user.id;

  // For UI display: always show as buyer view (owner can see their property from buyer perspective)
  const isOwnerForUI = false;

  // Fetch favorite status - now enabled for all users including owners
  const { data: isFavoriteData } = trpc.favorites.isFavorite.useQuery(
    { propertyId: propertyId },
    { enabled: !!user && isValidPropertyId }
  );
  const isFavorite = isFavoriteData?.isFavorite ?? false;

  // Fetch AI evaluation
  const { data: aiEvaluation } = trpc.evaluations.getAIEvaluation.useQuery(
    { propertyId: propertyId },
    { enabled: isValidPropertyId }
  );

  // Fetch document access status
  const { data: accessStatus, refetch: refetchAccessStatus } = trpc.documentAccess.getAccessStatus.useQuery(
    { propertyId: propertyId },
    {
      enabled: !!user && isValidPropertyId,
      onSuccess: (data) => {
        setHasDocumentAccess(data.hasAccess || data.isOwner);
        setHasManualApproval(data.hasManualApproval || data.isOwner);
      },
    }
  );

  // Fetch pending manual approval count (for owner only)
  const { data: pendingManualData, refetch: refetchPendingManual } = trpc.documentAccess.getPendingManualApprovalCount.useQuery(
    { propertyId: propertyId },
    {
      enabled: !!user && isValidPropertyId && !!property && property.user_id === user.id,
    }
  );

  // User Property Parameters - Query für die aktuelle Property
  const { data: userPropertyParams } = trpc.userPropertyParameters.get.useQuery(
    { propertyId: propertyId },
    {
      enabled: isValidPropertyId && !!user,
    }
  );

  // User Property Parameters - Mutation zum Speichern
  const saveUserPropertyParamsMutation = trpc.userPropertyParameters.upsert.useMutation({
    onSuccess: () => {
      utils.userPropertyParameters.get.invalidate({ propertyId: propertyId });
    },
    onError: (error) => {
      console.error('Error saving user property parameters:', error);
      alert('Fehler beim Speichern der Parameter. Bitte versuchen Sie es erneut.');
    },
  });

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
    // Berechnete Kennzahlen
    calculatedGrossYield?: number | null;
    calculatedRentMultiplier?: number | null;
    calculatedMonthlyCashflow?: number | null;
  }) => {
    saveUserPropertyParamsMutation.mutate({
      propertyId: property?.id as string,
      ...params,
    });
  };

  // Update hasDocumentAccess when accessStatus changes
  useEffect(() => {
    if (accessStatus) {
      setHasDocumentAccess(accessStatus.hasAccess || accessStatus.isOwner);
      setHasManualApproval(accessStatus.hasManualApproval || accessStatus.isOwner);
    }
  }, [accessStatus]);

  // Callback when document access is granted
  const handleDocumentAccessGranted = () => {
    setHasDocumentAccess(true);
    refetchAccessStatus();
  };

  // Callback when user clicks lock icon to request document access
  const handleRequestDocumentAccess = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    // Open consent dialog
    setIsConsentDialogOpen(true);
  };

  // Mutation to approve manual documents
  const approveManualDocsMutation = trpc.documentAccess.approveManualDocuments.useMutation({
    onSuccess: () => {
      refetchPendingManual();
    },
  });

  // Handler for approving manual documents (owner only)
  const handleApproveManualDocs = async () => {
    if (!property || !isOwner) return;
    await approveManualDocsMutation.mutateAsync({ propertyId: property.id });
  };

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
      // Invalidate and refetch property data to update the badge
      utils.properties.getByIdWithOwner.invalidate({ id: propertyId });
      setIsEvaluating(false);
    },
    onError: (error) => {
      console.error('Error evaluating property:', error);
      alert('Fehler bei der KI-Analyse. Bitte versuchen Sie es erneut.');
      setIsEvaluating(false);
    },
  });

  // KI Evaluation mutation (for buyer views)
  const generateKIEvaluationMutation = trpc.properties.generateKIEvaluation.useMutation({
    onSuccess: (data) => {
      console.log('✅ KI Evaluation received:', data);
      // Update buyer evaluation state
      const evalData = data as any;
      const newEvaluation = {
        ...buyerEvaluation,
        [evalData.viewType === 'buyer_selfuse' ? 'buyer_selfuse' : 'buyer_investor']: data,
      };
      console.log('📊 Updated buyer evaluation:', newEvaluation);
      setBuyerEvaluation(newEvaluation);

      // Invalidate and refetch AI evaluation to get market_average_price_per_sqm
      utils.evaluations.getAIEvaluation.invalidate({ propertyId: propertyId });
      // Invalidate and refetch property data to update the badge
      utils.properties.getByIdWithOwner.invalidate({ id: propertyId });

      setIsEvaluating(false);
    },
    onError: (error) => {
      console.error('Error generating KI evaluation:', error);
      alert('Fehler bei der KI-Bewertung. Bitte versuchen Sie es erneut.');
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
      setHasDocumentAccess(true);
      setHasManualApproval(true);
      setIsConsentDialogOpen(false);
      // Also update document access status since consent grants document access too
      refetchAccessStatus();
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
      setShowLoginModal(true);
      return;
    }

    // Toggle favorite using add/remove mutations
    if (isFavorite) {
      removeFavoriteMutation.mutate({ propertyId: propertyId });
    } else {
      addFavoriteMutation.mutate({ propertyId: propertyId });
    }
  };

  const handleDismiss = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Dismiss the property
    dismissMutation.mutate({ propertyId: propertyId });
  };

  const handleStartMessage = async () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Start conversation
    getOrCreateConversationMutation.mutate({ propertyId: propertyId });
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      setShowLoginModal(true);
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

  const handleTriggerEvaluation = async (viewType?: 'seller' | 'buyer_selfuse' | 'buyer_investor') => {
    console.log('🚀 handleTriggerEvaluation called with viewType:', viewType);
    // Guard: prevent double-clicking and concurrent evaluations
    if (!property || isEvaluating) {
      console.log('⚠️ Blocked: property=', !!property, 'isEvaluating=', isEvaluating);
      return;
    }

    // Check if user is authenticated - require login for AI evaluation
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // Check if user has access to AI analysis (requires investor+ plan)
    if (!canAccess('ai_analysis')) {
      console.log('⚠️ User does not have access to AI analysis, showing upgrade modal');
      setIsUpgradeModalOpen(true);
      return;
    }

    setIsEvaluating(true);
    try {
      // If viewType is provided and is a buyer view, use the new KI evaluation mutation
      if (viewType && (viewType === 'buyer_selfuse' || viewType === 'buyer_investor')) {
        await generateKIEvaluationMutation.mutateAsync({
          propertyId: property.id,
          viewType: viewType,
        });
      } else {
        // Legacy behavior: use investment evaluation for undefined viewType
        await evaluateMutation.mutateAsync({ propertyId: property.id });
      }
    } catch (error: any) {
      console.error('Error triggering evaluation:', error);
      // Check if error is due to plan restriction
      if (error?.data?.code === 'FORBIDDEN') {
        setIsUpgradeModalOpen(true);
      }
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
      <main className="min-h-screen bg-white dark:bg-[#030712] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Lade Property...</p>
      </main>
    );
  }

  if (!property) {
    return null;
  }

  // Convert property data to PropertyPreview format using central mapper
  const propertyPreviewData = mapToPropertyPreviewData(property as any, {
    isOwner: isOwnerForUI,
    aiEvaluation: aiEvaluation ?? undefined,
    buyerEvaluation: buyerEvaluation,
  });

  return (
    <main className="min-h-screen bg-white dark:bg-[#030712]">
      <Header />

      {/* Mobile Detail Header - Only shown on mobile */}
      <MobileDetailHeader
        title="Zurück"
        subtitle=""
        onBack={() => router.back()}
      />

      {/* Two Column Layout - Full Height, Centered - aligned with Header */}
      <PageContainer noPaddingY height="calc(100vh - 80px)">
        <div className="flex flex-col lg:flex-row h-full">
        {/* Left Column - Property Details (Scrollable) */}
        <div className="w-full lg:w-1/2 flex flex-col lg:h-[calc(100vh-80px)] order-2 lg:order-1 relative">
          {/* Sticky Back Button Header - Only shown on desktop */}
          <div className="hidden lg:flex items-center sticky top-0 bg-white/70 dark:bg-[#030712]/70 backdrop-blur-xl z-40 py-4 pr-6 -mb-16">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 p-2 hover:bg-gray-100/80 dark:hover:bg-gray-800/80 rounded-lg transition-colors"
              aria-label="Zurück"
            >
              <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
              <span className="text-gray-900 dark:text-white font-medium">Zurück</span>
            </button>
          </div>
          {/* Scrollable Content - pr-3 provides space for scrollbar */}
          <div className="flex-1 overflow-y-auto py-4 lg:pt-16 pr-3">

            {/* Property Preview Component */}
            <PropertyPreview
              data={propertyPreviewData}
              showAddress={!property.require_address_consent || hasConsent || Boolean(isOwner)}
              onRequestAddress={handleShowAddress}
              showInvestmentScore={true}
              isGeneratingEvaluation={isEvaluating}
              className="!shadow-none !rounded-none !bg-transparent"
              hasConsent={hasConsent}
              isOwner={isOwnerForUI}
              consentLoading={consentLoading}
              isUserLoggedIn={Boolean(user)}
              onGrantConsent={handleGrantConsent}
              showConsentSection={false}
              propertyId={property.id}
              evaluationViewType="buyer"
              onTriggerEvaluation={handleTriggerEvaluation}
              showEvaluationButton={true}
              showCTAs={false}
              onAddToFavorites={handleToggleFavorite}
              isFavorite={isFavorite}
              onDocumentSelect={setSelectedDocument}
              hasDocumentAccess={hasDocumentAccess}
              hasManualApproval={hasManualApproval}
              onDocumentAccessGranted={handleDocumentAccessGranted}
              onRequestDocumentAccess={handleRequestDocumentAccess}
              pendingManualApprovalCount={pendingManualData?.count ?? 0}
              onApproveManualDocs={handleApproveManualDocs}
              userPropertyParams={userPropertyParams}
              onSaveUserPropertyParams={handleSaveUserPropertyParams}
              isSavingUserPropertyParams={saveUserPropertyParamsMutation.isLoading}
            />

          </div>

          {/* Spacer for fixed ActionButtonPanel - ensures scrollbar ends above the panel */}
          <div className="h-20 flex-shrink-0" />
        </div>

        {/* Right Column - Property Card with Slideshow or Document Viewer */}
        {/* On mobile, always show slideshow (documents open in new tab) */}
        <div className="w-full lg:w-1/2 lg:sticky lg:top-20 h-[50vh] lg:h-[calc(100vh-80px)] py-4 lg:py-6 pl-0 lg:pl-6 order-1 lg:order-2">
          {selectedDocument && !isMobile ? (
            <DocumentViewer
              document={selectedDocument}
              onClose={() => setSelectedDocument(null)}
            />
          ) : (
            <PropertyImageSlideshow
              images={property.images}
              videoUrl={property.video_url}
              title={property.title}
              className="h-full"
              showCounter={true}
              showProgressBars={true}
              propertyType={property.property_type || undefined}
              overlay={
                <>
                  {/* AI-Score Badge - Top Right (Ring Variant) - Klickbar für AI-Score-Seite */}
                  {(() => {
                    const aiScore = property.ai_investment_score ?? property.ai_score;
                    if (!aiScore) return null;

                    return (
                      <div
                        className="absolute top-8 right-4 z-20 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => router.push(`/property/${params.id}/ai-score`)}
                        title="Zur detaillierten KI-Analyse"
                      >
                        <PropertyScoreBadge score={aiScore} variant="ring" />
                      </div>
                    );
                  })()}

                  {/* Action Buttons - Transparent Overlay Style */}
                  <ImageOverlayActions
                    className="absolute bottom-5 right-3 z-20"
                    direction="horizontal"
                    size="responsive"
                    isFavorite={isFavorite}
                    onFavorite={handleFavoriteToggle}
                    onMessage={handleStartMessage}
                    onShare={() => setIsShareModalOpen(true)}
                    onDismiss={handleDismiss}
                  />
                </>
              }
            />
          )}
        </div>
        </div>
      </PageContainer>

      {/* Action Button Panel - Fixed at bottom with blur */}
      <ActionButtonPanel layout="split">
        <PropertyActionButtons
          isOwner={isOwnerForUI}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          onDismiss={handleDismiss}
          onStartMessage={handleStartMessage}
          onOpenFeedback={() => setIsPropertyFeedbackModalOpen(true)}
          onEdit={() => router.push(`/edit-listing/${property.id}`)}
          onDeactivate={handleDeactivate}
          onShare={() => setIsShareModalOpen(true)}
          isDismissLoading={dismissMutation.isLoading}
          isMessageLoading={getOrCreateConversationMutation.isLoading}
          isDeactivateLoading={deactivateMutation.isLoading}
          propertyUrl={typeof window !== 'undefined' ? `${window.location.origin}/property/${property.id}` : ''}
        />
      </ActionButtonPanel>

      {/* Commission Consent Dialog */}
      <CommissionConsentDialog
        isOpen={isConsentDialogOpen}
        onClose={() => setIsConsentDialogOpen(false)}
        onAccept={handleCommissionConsentAccept}
        commissionRate={property.commission_rate || undefined}
        propertyPrice={property.price}
        propertyTitle={property.title}
      />

      {/* Share Link Modal */}
      <ShareLinkModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        propertyId={property.id}
        propertyTitle={property.title}
        documentsCount={((property.documents as unknown as PropertyDocument[]) || []).length}
      />

      {/* Login Prompt Modal - Progressive Disclosure */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        returnUrl={`/property/${params.id}`}
      />

      {/* Property Feedback Modal */}
      {/* <PropertyFeedbackModal
        isOpen={isPropertyFeedbackModalOpen}
        onClose={() => setIsPropertyFeedbackModalOpen(false)}
        onSubmit={async (feedbackData) => {
          await submitFeedbackMutation.mutateAsync({
            propertyId: property.id,
            ...feedbackData,
          });
        }}
        propertyTitle={property.title}
      /> */}
      {/* TODO: PropertyFeedbackModal component doesn't exist - need to create or remove this feature */}

      {/* Upgrade Modal - for premium features */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        feature="ai_analysis"
        requiredPlan="investor"
      />

      {/* Contact Success Toast */}
      {showContactSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-500 dark:bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 animate-slide-up">
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
