'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/app/components/Header';
import { PropertyImageSlideshow } from '@/app/components/PropertyImageSlideshow';
import { DocumentViewer } from '@/app/components/DocumentViewer';
import { PropertyPreview, PropertyPreviewData } from '@/app/components/PropertyPreview';
import type { PropertyDocument } from '@/app/create-listing/types';
import { MobileDetailHeader } from '@/app/components/MobileDetailHeader';
import { PageContainer } from '@/app/components/PageContainer';
import { ArrowLeft, Share2, ExternalLink } from 'lucide-react';
import { PropertyScoreBadge } from '@rendito/ui';
import { trpc } from '@/lib/trpc';

export default function SharedPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [selectedDocument, setSelectedDocument] = useState<PropertyDocument | null>(null);

  // Fetch property using full access token
  const { data: property, isLoading: loading, error } = trpc.properties.getByFullAccessToken.useQuery(
    { token },
    {
      enabled: !!token,
      retry: false,
    }
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Lade Immobilie...</p>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link ungültig</h1>
          <p className="text-gray-500 mb-6">
            Dieser Share-Link ist ungültig oder wurde widerrufen.
          </p>
          <button
            onClick={() => router.push('/')}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </main>
    );
  }

  // Convert property data to PropertyPreview format
  const detailedEval = property.ai_detailed_evaluation as any;

  const propertyPreviewData: PropertyPreviewData = {
    images: property.images || [],
    price: property.price || 0,
    commission_rate: property.commission_rate ?? undefined,
    location: property.location || '',
    // Full access: show address directly
    address: (property as any).street_address ?? undefined,
    postal_code: (property as any).postal_code ?? undefined,
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
    // Full access: no consent required
    require_address_consent: false,
    // Property details
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
    // Evaluation data
    evaluation: detailedEval?.evaluation ?? undefined,
    ai_recommendation: detailedEval?.ai_recommendation ?? undefined,
    // Documents - full access
    documents: (property.documents as unknown as PropertyDocument[]) || [],
    // Owner info - full access
    owner: property.owner ? {
      first_name: property.owner.first_name,
      last_name: property.owner.last_name,
      company: property.owner.company,
      avatar_url: property.owner.avatar_url,
      phone: property.owner.phone,
    } : undefined,
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Mobile Detail Header */}
      <div className="lg:hidden">
        <MobileDetailHeader
          title="Geteilte Immobilie"
          subtitle=""
          onBack={() => router.push('/')}
        />
      </div>

      {/* Full Access Banner */}
      <div className="bg-green-50 border-b border-green-200">
        <PageContainer noPaddingY>
          <div className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <Share2 size={18} />
              <span className="text-sm font-medium">
                Vollzugriff - Alle Informationen sind sichtbar
              </span>
            </div>
            <a
              href={`/property/${property.id}`}
              className="flex items-center gap-1 text-sm text-green-700 hover:text-green-800 font-medium"
            >
              <span>Zur Immobilie</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </PageContainer>
      </div>

      {/* Two Column Layout */}
      <PageContainer noPaddingY height="calc(100vh - 130px)">
        <div className="flex flex-col lg:flex-row h-full">
          {/* Left Column - Property Details */}
          <div className="w-full lg:w-1/2 flex flex-col lg:h-[calc(100vh-130px)] order-2 lg:order-1">
            <div className="flex-1 overflow-y-auto py-4 lg:py-8 pr-0 lg:pr-6 pb-8">
              {/* Back Button - Desktop only */}
              <button
                onClick={() => router.push('/')}
                className="hidden lg:flex items-center gap-2 p-2 mb-4 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Zur Startseite"
              >
                <ArrowLeft size={24} className="text-gray-900" />
                <span className="text-gray-900 font-medium">Zur Startseite</span>
              </button>

              {/* Property Preview - Full Access Mode */}
              <PropertyPreview
                data={propertyPreviewData}
                showAddress={true}
                showInvestmentScore={true}
                className="!shadow-none !rounded-none !bg-transparent"
                hasConsent={true}
                isOwner={false}
                consentLoading={false}
                isUserLoggedIn={false}
                showConsentSection={false}
                propertyId={property.id}
                evaluationViewType="buyer"
                showEvaluationButton={false}
                showCTAs={false}
                onDocumentSelect={setSelectedDocument}
              />
            </div>
          </div>

          {/* Right Column - Images/Documents */}
          <div className="w-full lg:w-1/2 lg:sticky lg:top-20 h-[50vh] lg:h-[calc(100vh-130px)] py-4 lg:py-6 pl-0 lg:pl-6 order-1 lg:order-2">
            {selectedDocument ? (
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
                    {/* AI-Score Badge */}
                    {(() => {
                      const aiScore = property.ai_investment_score ?? property.ai_score;
                      if (!aiScore) return null;

                      return (
                        <div className="absolute top-14 right-6 z-20">
                          <PropertyScoreBadge score={aiScore} variant="overlay" />
                        </div>
                      );
                    })()}
                  </>
                }
              />
            )}
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
