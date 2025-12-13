'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';
import { PropertyImageSlideshow } from '../components/PropertyImageSlideshow';
import { PropertyPreview, PropertyPreviewData } from '../components/PropertyPreview';
import { AIEvaluationPanel, type SellerEvaluation } from '../components/AIEvaluationPanel';
import { DeletePropertyModal } from '../components/DeletePropertyModal';
import { MapPin, Home, Plus, Eye, Pencil, Power, Heart, X } from 'lucide-react';
import { PropertyListThumbnail } from '../components/PropertyListThumbnail';
import { trpc } from '@/lib/trpc';
import { useMasterDetailNavigation } from '@/app/hooks/useMasterDetailNavigation';
import { MobileDetailHeader } from '../components/MobileDetailHeader';

type StatusFilter = 'all' | 'active' | 'archived' | 'pending' | 'sold';

// Helper function to convert seller_analysis data to SellerEvaluation format
function convertSellerAnalysisToEvaluation(sellerAnalysis: any): SellerEvaluation | undefined {
  if (!sellerAnalysis) return undefined;

  // Extract market position data
  const marketPosition = sellerAnalysis.market_position;
  const pricePerSqm = marketPosition?.market_average_price_per_sqm || 0;

  // Calculate estimated market value based on market average
  // This is a rough estimate - the actual property sqm would be needed for accuracy
  const marketValueMin = pricePerSqm * 0.9;
  const marketValueMax = pricePerSqm * 1.1;

  // Use AI-generated selling points (highlights of the property)
  const sellingPoints: string[] = sellerAnalysis.selling_points || [];

  // Summarize improvements to top 3, shortened
  const shortenSuggestion = (text: string): string => {
    // Take first sentence or truncate at 80 chars
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence.length <= 80) return firstSentence;
    return firstSentence.substring(0, 77) + '...';
  };

  const improvements = (sellerAnalysis.improvements || [])
    .slice(0, 3)
    .map(shortenSuggestion);

  return {
    viewType: 'seller',
    marketValueMin: Math.round(marketValueMin * 100), // Placeholder - would need sqm
    marketValueMax: Math.round(marketValueMax * 100), // Placeholder - would need sqm
    recommendedPrice: Math.round(pricePerSqm * 100), // Placeholder
    comparableSales: 5, // Placeholder
    marketingDurationMin: 4,
    marketingDurationMax: 8,
    priceAssessment: marketPosition?.price_comparison === 'above_market'
      ? 'Über Marktwert'
      : marketPosition?.price_comparison === 'below_market'
        ? 'Unter Marktwert'
        : 'Marktgerecht',
    summary: marketPosition?.recommendation || 'Keine Zusammenfassung verfügbar',
    sellingPoints: sellingPoints.length > 0 ? sellingPoints : [],
    improvementSuggestions: improvements,
  };
}

export default function MyPropertiesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; title: string; price: number } | null>(null);

  // Deactivate modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [propertyToDeactivate, setPropertyToDeactivate] = useState<{ id: string; title: string; price: number } | null>(null);

  // Performance tracking
  const pageLoadStartTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const pageLoadLoggedRef = useRef(false);

  renderCountRef.current += 1;

  // Fetch user's properties with tRPC
  const { data: properties = [], isLoading: loading } = trpc.properties.getByUserId.useQuery(undefined, {
    enabled: !!user,
    onSuccess: () => {
      const duration = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-MY-PROPS] Properties loaded in ${duration.toFixed(2)}ms`);
    },
  });

  // Get utils for cache invalidation
  const utils = trpc.useContext();

  // Activate mutation
  const activateMutation = trpc.properties.activate.useMutation({
    onSuccess: () => {
      utils.properties.getByUserId.invalidate();
    },
    onError: (error) => {
      console.error('Error activating property:', error);
      alert('Fehler beim Aktivieren des Inserats.');
    },
  });

  // Deactivate mutation
  const deactivateMutation = trpc.properties.deactivate.useMutation({
    onSuccess: () => {
      utils.properties.getByUserId.invalidate();
      // Close modal
      setDeactivateModalOpen(false);
      setPropertyToDeactivate(null);
    },
    onError: (error) => {
      console.error('Error deactivating property:', error);
      alert('Fehler beim Deaktivieren des Inserats.');
      setDeactivateModalOpen(false);
      setPropertyToDeactivate(null);
    },
  });

  // Generate seller analysis mutation
  const generateSellerAnalysisMutation = trpc.properties.generateSellerAnalysis.useMutation({
    onSuccess: () => {
      utils.properties.getByUserId.invalidate();
    },
    onError: (error) => {
      console.error('Error generating seller analysis:', error);
      alert('Fehler bei der Verkäufer-Analyse. Bitte versuchen Sie es erneut.');
    },
  });

  // Delete mutation
  const deleteMutation = trpc.properties.delete.useMutation({
    onSuccess: () => {
      utils.properties.getByUserId.invalidate();
      // Return to list view on mobile
      goBack();
      // Close modal
      setDeleteModalOpen(false);
      setPropertyToDelete(null);
    },
    onError: (error) => {
      console.error('Error deleting property:', error);
      alert('Fehler beim Löschen des Inserats.');
      setDeleteModalOpen(false);
      setPropertyToDelete(null);
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirectTo=/my-properties');
    }
  }, [user, authLoading, router]);

  // Log page fully loaded
  useEffect(() => {
    if (!loading && !authLoading && !pageLoadLoggedRef.current) {
      const pageLoadTime = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-MY-PROPS] Page fully loaded in ${pageLoadTime.toFixed(2)}ms (${(pageLoadTime / 1000).toFixed(2)}s)`);
      console.log(`📄 [PERF-MY-PROPS] Total renders: ${renderCountRef.current}`);
      pageLoadLoggedRef.current = true;
    }
  }, [loading, authLoading]);

  const handleActivate = async (propertyId: string) => {
    activateMutation.mutate({ id: propertyId });
  };

  const handleDeactivateClick = (property: { id: string; title: string; price: number }) => {
    setPropertyToDeactivate(property);
    setDeactivateModalOpen(true);
  };

  const handleDeactivateConfirm = (reason: string, soldPrice?: number) => {
    if (!propertyToDeactivate) return;

    // For now, just deactivate - we could extend the API to accept reason and soldPrice later
    deactivateMutation.mutate({ id: propertyToDeactivate.id });
  };

  const handleGenerateSellerAnalysis = async (propertyId: string) => {
    generateSellerAnalysisMutation.mutate({ propertyId });
  };

  const handleDeleteClick = (property: { id: string; title: string; price: number }) => {
    setPropertyToDelete(property);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = (reason: string, soldPrice?: number) => {
    if (!propertyToDelete) return;

    deleteMutation.mutate({
      id: propertyToDelete.id,
      reason: reason as 'sold' | 'not_relevant' | 'temporarily_offline',
      soldPrice: soldPrice,
    });
  };

  // Filter properties based on selected status
  const filteredProperties = properties.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  // Sort properties: when filter is 'all', show active properties first, then archived
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (statusFilter === 'all') {
      // Active properties (active, pending, sold) come before archived
      const aIsActive = a.status !== 'archived';
      const bIsActive = b.status !== 'archived';

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;
    }
    return 0;
  });

  // Mobile master-detail navigation
  const { selectedItem: selectedProperty, selectedPropertyId, selectItem, goBack } =
    useMasterDetailNavigation(sortedProperties, '/my-properties');

  // Track last selected ID for visual indication on mobile
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPropertyId) {
      setLastSelectedId(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return { label: 'Aktiv', bg: 'bg-green-500', text: 'text-white' };
      case 'pending':
        return { label: 'Ausstehend', bg: 'bg-yellow-500', text: 'text-white' };
      case 'archived':
        return { label: 'Deaktiviert', bg: 'bg-gray-500', text: 'text-white' };
      case 'sold':
        return { label: 'Verkauft', bg: 'bg-blue-500', text: 'text-white' };
      default:
        return { label: status || 'Unbekannt', bg: 'bg-gray-500', text: 'text-white' };
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <p className="text-gray-500">Lade Immobilien...</p>
        </div>
      </main>
    );
  }

  // Convert property data to PropertyPreview format
  // Extract detailed evaluation data from JSONB field
  const detailedEval = selectedProperty ? (selectedProperty as any).ai_detailed_evaluation : null;
  const sellerEval = selectedProperty ? convertSellerAnalysisToEvaluation((selectedProperty as any).seller_analysis) : undefined;

  const propertyPreviewData: PropertyPreviewData | null = selectedProperty ? {
    images: selectedProperty.images || [],
    price: selectedProperty.price || 0,
    commission_rate: selectedProperty.commission_rate ?? undefined,
    location: selectedProperty.location || '',
    address: selectedProperty.address ?? undefined,
    title: selectedProperty.title || '',
    type: (selectedProperty as any).property_type ?? undefined,
    sqm: selectedProperty.sqm || 0,
    rooms: selectedProperty.rooms || 0,
    description: selectedProperty.description || '',
    features: selectedProperty.features ?? undefined,
    yield: selectedProperty.yield ?? undefined,
    highlights: selectedProperty.highlights ?? undefined,
    red_flags: selectedProperty.red_flags ?? undefined,
    ai_investment_score: (selectedProperty as any).ai_investment_score ?? selectedProperty.ai_score ?? undefined,
    require_address_consent: false,
    monthly_fee: (selectedProperty as any).monthly_fee ?? undefined,
    usable_area: (selectedProperty as any).usable_area ?? undefined,
    usable_area_ratio: (selectedProperty as any).usable_area_ratio ?? undefined,
    bathrooms: (selectedProperty as any).bathrooms ?? undefined,
    total_floors: (selectedProperty as any).total_floors ?? undefined,
    floor_level: (selectedProperty as any).floor_level ?? undefined,
    available_from: (selectedProperty as any).available_from ?? undefined,
    year_built: (selectedProperty as any).year_built ?? undefined,
    heating_type: (selectedProperty as any).heating_type ?? undefined,
    energy_source: (selectedProperty as any).energy_source ?? undefined,
    energy_certificate: (selectedProperty as any).energy_certificate ?? undefined,
    energy_efficiency_class: (selectedProperty as any).energy_efficiency_class ?? undefined,
    condition: (selectedProperty as any).condition ?? undefined,
    important_notes: (selectedProperty as any).important_notes ?? undefined,
    // Extract AI analysis data from ai_detailed_evaluation JSONB
    actual_monthly_rent: (selectedProperty as any).actual_monthly_rent ?? undefined,
    yield_metrics: detailedEval?.yield_metrics ?? undefined,
    rental_income: detailedEval?.rental_income ?? undefined,
    cashflow_calculation: detailedEval?.cashflow_calculation ?? undefined,
    evaluation: detailedEval?.evaluation ?? undefined,
    // AI Rating fields
    ai_rating_explanation: (selectedProperty as any).ai_rating_explanation ?? undefined,
    strengths: (selectedProperty as any).strengths ?? undefined,
    weaknesses: (selectedProperty as any).weaknesses ?? undefined,
    opportunities: (selectedProperty as any).opportunities ?? undefined,
    risks: (selectedProperty as any).risks ?? undefined,
    // Days online
    days_online: (selectedProperty as any).days_online ?? undefined,
    // Aggregated feedback stats (only for seller view)
    total_views: (selectedProperty as any).total_views ?? undefined,
    favorites_count: (selectedProperty as any).favorites_count ?? undefined,
    rating_count: (selectedProperty as any).rating_count ?? undefined,
    avg_rating: (selectedProperty as any).avg_rating ?? undefined,
    avg_suggested_price: (selectedProperty as any).avg_suggested_price ?? undefined,
    // Seller evaluation from seller_analysis JSONB field
    seller_evaluation: sellerEval,
  } : null;

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {properties.length === 0 ? (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home size={48} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Noch keine Immobilien
            </h2>
            <p className="text-gray-500 mb-6">
              Erstellen Sie Ihr erstes Immobilienangebot
            </p>
            <Link href="/create-listing">
              <button className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2">
                <Plus size={20} />
                Immobilie hinzufügen
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
          {/* Mobile Header - visible only on small screens when no detail is shown */}
          <div className={`${selectedPropertyId ? 'hidden' : 'block'} lg:hidden bg-white border-b border-gray-200 p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Meine Inserate</h1>
                <p className="text-gray-500 text-sm">{properties.length} Immobilien</p>
              </div>
              <Link href="/create-listing">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                  <Plus size={16} />
                  <span>Erstellen</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Left Column - Properties List */}
          <div className={`${selectedPropertyId ? 'hidden' : 'block'} lg:block lg:w-1/4 border-r border-gray-200 overflow-y-auto`}>
            <div className="p-4">
              {/* Desktop Header - Hidden on mobile */}
              <div className="hidden lg:flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Meine Inserate</h1>
                  <p className="text-gray-500 text-sm">{properties.length} Immobilien</p>
                </div>
                <Link href="/create-listing">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus size={16} />
                    <span>Erstellen</span>
                  </button>
                </Link>
              </div>

              {/* Status Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Alle ({properties.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'active'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Aktiv ({properties.filter(p => p.status === 'active').length})
                </button>
                <button
                  onClick={() => setStatusFilter('archived')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === 'archived'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Deaktiviert ({properties.filter(p => p.status === 'archived').length})
                </button>
              </div>

              <div className="space-y-3">
                {sortedProperties.map((property, index) => {
                  // Show selection: current selected OR last selected (for mobile when back to list)
                  const isSelected = property.id === selectedPropertyId ||
                                   (!selectedPropertyId && property.id === lastSelectedId);

                  return (
                    <PropertyListThumbnail
                      key={property.id}
                      id={property.id}
                      title={property.title}
                      isSelected={isSelected}
                      onClick={() => selectItem(property.id)}
                      image={property.images?.[0]}
                      price={property.price}
                      location={property.location}
                      statusOnline={property.status === 'active'}
                      viewCount={(property as any).unique_viewers || 0}
                      favoriteCount={(property as any).favorites_count || 0}
                      onDelete={(e) => {
                        e.stopPropagation();
                        handleDeleteClick({
                          id: property.id,
                          title: property.title,
                          price: property.price,
                        });
                      }}
                      deleteTooltip="Inserat löschen"
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Property Details (same as detail page) */}
          <div className={`${selectedPropertyId ? 'block' : 'hidden'} lg:block lg:w-3/4 flex flex-col lg:h-[calc(100vh-100px)]`}>
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
                  <div className="w-full lg:w-1/2 flex flex-col lg:h-[calc(100vh-100px)]">
                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-48 lg:pb-8">
                    {/* PropertyPreview Component */}
                    {propertyPreviewData && (
                      <PropertyPreview
                        data={propertyPreviewData}
                        showAddress={true}
                        className="!shadow-none !rounded-none !bg-transparent"
                        showInvestmentScore={false}
                        isOwner={true}
                        hideProviderInfo={true}
                        sellerAnalysisMarketAverage={(selectedProperty as any).seller_analysis?.market_position?.market_average_price_per_sqm}
                        evaluationViewType="seller"
                        onTriggerEvaluation={(viewType) => handleGenerateSellerAnalysis(selectedProperty.id)}
                        propertyId={selectedProperty.id}
                        isGeneratingEvaluation={generateSellerAnalysisMutation.isLoading}
                      />
                    )}

                    {/* Anbieter Info */}
                    <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Anbieter</h3>
                      <div className="flex items-center gap-4">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={`${profile?.first_name || ''} ${profile?.last_name || ''}`}
                            className="w-16 h-16 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-400">
                              {profile?.first_name?.charAt(0)?.toUpperCase() || 'P'}
                            </span>
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-900">
                            {profile?.first_name || profile?.last_name
                              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                              : 'Privater Anbieter'}
                          </h4>
                          {profile?.company ? (
                            <p className="text-sm text-gray-600">{profile.company}</p>
                          ) : (
                            <p className="text-sm text-gray-500">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons - Responsive: stacked on mobile, row on tablet+ */}
                  <div className="bg-white p-4 lg:p-8 pt-4 border-t border-gray-100 mb-20 lg:mb-0">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {/* Bearbeiten Button */}
                      <button
                        onClick={() => router.push(`/edit-listing/${selectedProperty.id}`)}
                        className="flex-1 bg-primary text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-colors inline-flex items-center justify-center gap-2 text-sm"
                      >
                        <Pencil size={16} />
                        <span>Bearbeiten</span>
                      </button>

                      {/* Aktivieren/Deaktivieren Button */}
                      {selectedProperty.status === 'archived' ? (
                        <button
                          onClick={() => handleActivate(selectedProperty.id)}
                          disabled={activateMutation.isLoading}
                          className="flex-1 bg-green-500 text-white font-semibold py-3 px-4 rounded-xl hover:bg-green-600 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          <Power size={16} />
                          <span>{activateMutation.isLoading ? '...' : 'Aktivieren'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivateClick({
                            id: selectedProperty.id,
                            title: selectedProperty.title,
                            price: selectedProperty.price,
                          })}
                          disabled={deactivateMutation.isLoading}
                          className="flex-1 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                        >
                          <Power size={16} />
                          <span>{deactivateMutation.isLoading ? '...' : 'Deaktivieren'}</span>
                        </button>
                      )}

                      {/* Löschen Button */}
                      <button
                        onClick={() => handleDeleteClick({
                          id: selectedProperty.id,
                          title: selectedProperty.title,
                          price: selectedProperty.price,
                        })}
                        disabled={deleteMutation.isLoading}
                        className="flex-1 bg-white border-2 border-red-300 text-red-600 font-semibold py-3 px-4 rounded-xl hover:bg-red-50 hover:border-red-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18"></path>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        </svg>
                        <span>{deleteMutation.isLoading ? '...' : 'Löschen'}</span>
                      </button>
                    </div>
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
                      slideshowId={`my-properties-${selectedProperty.id}`}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                {sortedProperties.length === 0 ? (
                  <div className="text-center">
                    <p>Keine Immobilien mit diesem Status</p>
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="mt-2 text-primary hover:underline"
                    >
                      Alle anzeigen
                    </button>
                  </div>
                ) : (
                  'Wählen Sie eine Immobilie aus der Liste'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Property Modal */}
      {propertyToDelete && (
        <DeletePropertyModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setPropertyToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteMutation.isLoading}
          propertyTitle={propertyToDelete.title}
          originalPrice={propertyToDelete.price}
          mode="delete"
        />
      )}

      {/* Deactivate Property Modal */}
      {propertyToDeactivate && (
        <DeletePropertyModal
          isOpen={deactivateModalOpen}
          onClose={() => {
            setDeactivateModalOpen(false);
            setPropertyToDeactivate(null);
          }}
          onConfirm={handleDeactivateConfirm}
          isDeleting={deactivateMutation.isLoading}
          propertyTitle={propertyToDeactivate.title}
          originalPrice={propertyToDeactivate.price}
          mode="deactivate"
        />
      )}
    </main>
  );
}
