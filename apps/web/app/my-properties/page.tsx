'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import type { Property } from '@immoflow/database';
import { Header } from '../components/Header';
import { PropertyPreview } from '../components/PropertyPreview';
import { AIEvaluationPanel, type SellerEvaluation } from '../components/AIEvaluationPanel';
import type { PropertyDocument } from '../create-listing/types';
import { mapToPropertyPreviewData } from '../utils/propertyMapper';
import { DeletePropertyModal } from '../components/DeletePropertyModal';
import { InterestedPartiesList } from '../components/InterestedPartiesList';
import { ShareLinkModal } from '../components/ShareLinkModal';
import { Home, Plus, Pencil, Power, Trash2, Share2 } from 'lucide-react';
import { PropertyListThumbnail } from '../components/PropertyListThumbnail';
import { trpc } from '@/lib/trpc';
import { useMasterDetailNavigation } from '@/app/hooks/useMasterDetailNavigation';
import { MasterDetailLayout, PropertyDetailLayout } from '../components/layouts/MasterDetailLayout';

type StatusFilter = 'all' | 'active' | 'archived' | 'pending' | 'sold';

// Typed seller_analysis structure
interface SellerAnalysisData {
  market_position?: {
    price_comparison?: 'above_market' | 'market_average' | 'below_market';
    market_average_price_per_sqm?: number;
    recommendation?: string;
  };
  selling_points?: string[];
  improvements?: string[];
}

// Typed ai_detailed_evaluation structure
interface AIDetailedEvaluationData {
  yield_metrics?: unknown;
  rental_income?: unknown;
  cashflow_calculation?: unknown;
  evaluation?: unknown;
}

// Extended property type with statistics from getByUserId query
// Using Omit to override JSONB fields with proper types
type PropertyWithStats = Omit<Property, 'seller_analysis' | 'ai_detailed_evaluation'> & {
  // Statistics fields from LEFT JOIN
  total_views: number;
  unique_viewers: number;
  favorites_count: number;
  rating_count: number;
  views_last_7_days: number;
  views_last_30_days: number;
  feedback_count: number;
  avg_rating: number | null;
  avg_suggested_price: number | null;
  positive_feedback_count: number | null;
  neutral_feedback_count: number | null;
  negative_feedback_count: number | null;
  days_online: number;
  // Override JSONB fields with proper types
  seller_analysis: SellerAnalysisData | null;
  seller_evaluation: SellerEvaluation | null;
  ai_detailed_evaluation: AIDetailedEvaluationData | null;
  // Additional fields that may be returned but not in base Property type
  actual_monthly_rent?: number | null;
  strengths?: string[] | null;
  weaknesses?: string[] | null;
  opportunities?: string[] | null;
  risks?: string[] | null;
};

export default function MyPropertiesPage() {
  const { user, profile, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Document preview state
  const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<{ id: string; title: string; price: number } | null>(null);

  // Deactivate modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [propertyToDeactivate, setPropertyToDeactivate] = useState<{ id: string; title: string; price: number } | null>(null);

  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Performance tracking
  const pageLoadStartTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const pageLoadLoggedRef = useRef(false);

  renderCountRef.current += 1;

  // Fetch user's properties with tRPC
  const { data: propertiesData = [], isLoading: loading } = trpc.properties.getByUserId.useQuery(undefined, {
    enabled: !!user,
    onSuccess: () => {
      const duration = performance.now() - pageLoadStartTimeRef.current;
      console.log(`📄 [PERF-MY-PROPS] Properties loaded in ${duration.toFixed(2)}ms`);
    },
  });

  // Cast to PropertyWithStats for proper typing
  const properties = propertiesData as PropertyWithStats[];

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

  // Generate seller evaluation mutation (uses property-seller-evaluator with realistic market value validation)
  const generateSellerEvaluationMutation = trpc.properties.generateKIEvaluation.useMutation({
    onSuccess: () => {
      utils.properties.getByUserId.invalidate();
    },
    onError: (error) => {
      console.error('Error generating seller evaluation:', error);
      alert('Fehler bei der Verkäufer-Bewertung. Bitte versuchen Sie es erneut.');
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

  const handleDeactivateConfirm = (_reason: string, _soldPrice?: number) => {
    if (!propertyToDeactivate) return;
    // TODO: Extend API to accept reason and soldPrice for analytics
    deactivateMutation.mutate({ id: propertyToDeactivate.id });
  };

  const handleGenerateSellerEvaluation = async (propertyId: string) => {
    generateSellerEvaluationMutation.mutate({ propertyId, viewType: 'seller' });
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

  // Get the actual selected property ID for use in effects
  const selectedPropertyActualId = selectedProperty?.id;

  // Track last selected ID for visual indication on mobile
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPropertyId) {
      setLastSelectedId(selectedPropertyId);
    }
  }, [selectedPropertyId]);

  // Reset document preview when the ACTUAL displayed property changes
  useEffect(() => {
    setSelectedDocument(null);
  }, [selectedPropertyActualId]);

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
          <p className="text-gray-500">Lade Immobilien...</p>
        </div>
      </main>
    );
  }

  // Convert property data to PropertyPreview format using central mapper
  const propertyPreviewData = selectedProperty
    ? mapToPropertyPreviewData(selectedProperty as any, { isOwner: true })
    : null;

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Action Buttons - reused in mobile and desktop */}
      {(() => {
        const ActionButtons = selectedProperty ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Bearbeiten Button */}
            <button
              onClick={() => router.push(`/edit-listing/${selectedProperty.id}`)}
              className="bg-primary text-white font-semibold py-3 px-3 rounded-xl hover:opacity-90 transition-colors inline-flex items-center justify-center gap-2 text-sm"
            >
              <Pencil size={16} />
              <span>Bearbeiten</span>
            </button>

            {/* 2. Veröffentlichen/Aktivieren/Deaktivieren Button */}
            {selectedProperty.status === 'pending' ? (
              <button
                onClick={() => handleActivate(selectedProperty.id)}
                disabled={activateMutation.isLoading}
                className="bg-green-500 text-white font-semibold py-3 px-3 rounded-xl hover:bg-green-600 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <Power size={16} />
                <span>{activateMutation.isLoading ? '...' : 'Veröffentlichen'}</span>
              </button>
            ) : selectedProperty.status === 'archived' ? (
              <button
                onClick={() => handleActivate(selectedProperty.id)}
                disabled={activateMutation.isLoading}
                className="bg-green-500 text-white font-semibold py-3 px-3 rounded-xl hover:bg-green-600 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
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
                className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-3 rounded-xl hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                <Power size={16} />
                <span>{deactivateMutation.isLoading ? '...' : 'Deaktivieren'}</span>
              </button>
            )}

            {/* 3. Löschen Button */}
            <button
              onClick={() => handleDeleteClick({
                id: selectedProperty.id,
                title: selectedProperty.title,
                price: selectedProperty.price,
              })}
              disabled={deleteMutation.isLoading}
              className="bg-white border-2 border-red-300 text-red-600 font-semibold py-3 px-3 rounded-xl hover:bg-red-50 hover:border-red-400 transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
            >
              <Trash2 size={16} />
              <span>{deleteMutation.isLoading ? '...' : 'Löschen'}</span>
            </button>

            {/* 4. Teilen Button */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-3 rounded-xl hover:border-gray-400 transition-colors inline-flex items-center justify-center gap-2 text-sm"
            >
              <Share2 size={16} />
              <span>Teilen</span>
            </button>
          </div>
        ) : null;

        return (
          <MasterDetailLayout
            hasItems={properties.length > 0}
            showDetail={!!selectedPropertyId}
            emptyState={
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
            }
            mobileHeader={
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Meine Inserate</h1>
                </div>
                <Link href="/create-listing">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    <Plus size={16} />
                    <span>Erstellen</span>
                  </button>
                </Link>
              </div>
            }
            desktopHeader={
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Meine Inserate</h1>
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
              </>
            }
            masterContent={
              <>
                {/* Status Filter - Mobile */}
                <div className="lg:hidden flex flex-wrap gap-2 mb-4">
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
                  {sortedProperties.map((property) => {
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
                        postalCode={(property as any).postal_code}
                        statusOnline={property.status === 'active'}
                        statusPending={property.status === 'pending'}
                        viewCount={property.unique_viewers || 0}
                        favoriteCount={property.favorites_count || 0}
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
              </>
            }
            detailContent={
              selectedProperty ? (
                <PropertyDetailLayout
                  images={selectedProperty.images || []}
                  propertyTitle={selectedProperty.title}
                  propertyId={selectedProperty.id}
                  propertyType={selectedProperty.property_type || undefined}
                  onBack={goBack}
                  showMobileHeader={!!selectedPropertyId}
                  desktopActionButtons={ActionButtons}
                  mobileActionButtons={ActionButtons}
                  selectedDocument={selectedDocument}
                  onDocumentClose={() => setSelectedDocument(null)}
                >
                  {/* PropertyPreview Component */}
                  {propertyPreviewData && (
                    <PropertyPreview
                      key={selectedProperty.id}
                      data={propertyPreviewData}
                      showAddress={true}
                      className="!shadow-none !rounded-none !bg-transparent"
                      showInvestmentScore={false}
                      isOwner={true}
                      hideProviderInfo={true}
                      sellerAnalysisMarketAverage={selectedProperty.seller_analysis?.market_position?.market_average_price_per_sqm}
                      evaluationViewType="seller"
                      onTriggerEvaluation={(viewType) => handleGenerateSellerEvaluation(selectedProperty.id)}
                      propertyId={selectedProperty.id}
                      isGeneratingEvaluation={generateSellerEvaluationMutation.isPending}
                      onDocumentSelect={setSelectedDocument}
                    />
                  )}

                  {/* Interessenten - Dokumentzugriff-Anfragen */}
                  <div className="mt-6">
                    <InterestedPartiesList
                      propertyId={selectedProperty.id}
                      defaultExpanded={true}
                    />
                  </div>
                </PropertyDetailLayout>
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
              )
            }
          />
        );
      })()}

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

      {/* Share Link Modal */}
      {selectedProperty && (
        <ShareLinkModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          propertyId={selectedProperty.id}
          propertyTitle={selectedProperty.title}
          documentsCount={(selectedProperty as PropertyWithStats & { documents_count?: number }).documents_count || 0}
        />
      )}
    </main>
  );
}
