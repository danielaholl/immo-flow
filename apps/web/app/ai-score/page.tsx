'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Header } from '../components/Header';
import { AIScoreCard } from '../components/AIScoreCard';
import { trpc } from '@/lib/trpc';
import { Calculator, Sparkles, MapPin, Home, Calendar, Euro, Loader2, Building2 } from 'lucide-react';

// Kompakte Property-Info-Karte (ähnlich wie im Steuer-Optimierer)
function PropertyInfoCard({ property }: { property: {
  id: string;
  title: string;
  price: number;
  location: string;
  sqm: number;
  rooms: number;
  images: string[];
  year_built?: number | null;
} }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Bild */}
      <div className="relative h-48">
        {property.images && property.images.length > 0 ? (
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
            <Building2 className="w-12 h-12 text-gray-400" />
          </div>
        )}
        {/* Badge */}
        <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
          Geprüft
        </div>
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{property.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
          <MapPin size={14} />
          {property.location}
        </p>
        <div className="flex justify-between items-end mt-4">
          <span className="text-xl font-bold text-primary">
            {property.price.toLocaleString('de-DE')} €
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {property.sqm} m² · {property.rooms} Zi.
          </span>
        </div>
        {property.year_built && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Baujahr: {property.year_built}
          </p>
        )}
      </div>
    </div>
  );
}

interface FormData {
  price: string;
  sqm: string;
  monthlyRent: string;
  yearBuilt: string;
  location: string;
}

export default function AIScorePage() {
  const searchParams = useSearchParams();
  const propertyId = searchParams.get('propertyId');

  const [formData, setFormData] = useState<FormData>({
    price: '',
    sqm: '',
    monthlyRent: '',
    yearBuilt: '',
    location: '',
  });

  const [result, setResult] = useState<{
    score: number;
    summary: string;
    factors: {
      location: number;
      pricePerformance: number;
      appreciation: number;
      rentability: number;
    };
    grossYield?: number;
  } | null>(null);

  // Load property data if propertyId is provided
  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId! },
    { enabled: !!propertyId }
  );

  // Load cached AI score analysis for property
  const { data: cachedAnalysis } = trpc.evaluations.getAIScoreAnalysis.useQuery(
    { propertyId: propertyId! },
    { enabled: !!propertyId }
  );

  // Manual AI score calculation mutation
  const calculateScore = trpc.evaluations.calculateManualAIScore.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
  });

  // Pre-fill form when property data is loaded
  useEffect(() => {
    if (property) {
      setFormData({
        price: property.price?.toString() || '',
        sqm: property.sqm?.toString() || '',
        monthlyRent: property.actual_monthly_rent?.toString() || '',
        yearBuilt: property.year_built?.toString() || '',
        location: property.location || '',
      });
    }
  }, [property]);

  // Set result from cached analysis
  useEffect(() => {
    if (cachedAnalysis && property) {
      const factors = cachedAnalysis.factors;
      const overallScore = Math.round(
        (factors.location * 0.25) +
        (factors.pricePerformance * 0.30) +
        (factors.appreciation * 0.20) +
        (factors.rentability * 0.25)
      );
      setResult({
        score: overallScore,
        summary: cachedAnalysis.summary,
        factors: cachedAnalysis.factors,
      });
    }
  }, [cachedAnalysis, property]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const price = parseFloat(formData.price);
    const sqm = parseFloat(formData.sqm);
    const monthlyRent = formData.monthlyRent ? parseFloat(formData.monthlyRent) : undefined;
    const yearBuilt = formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined;

    if (!price || !sqm || !formData.location) {
      alert('Bitte füllen Sie mindestens Kaufpreis, Wohnfläche und Standort aus.');
      return;
    }

    calculateScore.mutate({
      price,
      sqm,
      location: formData.location,
      monthlyRent,
      yearBuilt,
    });
  };

  const isFormValid = formData.price && formData.sqm && formData.location;

  // Only show loading if we have a propertyId and are actively fetching
  if (propertyId && propertyLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#030712]">
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E31C5F] to-[#FF9500] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              AI-Score Rechner
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Bewerten Sie das Investment-Potential einer Immobilie mit KI-Unterstützung
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - PropertyInfoCard or Form */}
          {propertyId && property ? (
            // Property Info Card when propertyId is provided
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Building2 size={20} />
                Ausgewählte Immobilie
              </h2>
              <PropertyInfoCard property={property} />
            </div>
          ) : (
            // Input Form when no propertyId
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator size={20} />
                Immobiliendaten
              </h2>

              <div className="space-y-4">
                {/* Kaufpreis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kaufpreis *
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="z.B. 350000"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Wohnfläche */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Wohnfläche (m²) *
                  </label>
                  <div className="relative">
                    <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.sqm}
                      onChange={(e) => handleInputChange('sqm', e.target.value)}
                      placeholder="z.B. 75"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Standort */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Standort / Stadt *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="z.B. München, Schwabing"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Monatliche Miete */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monatliche Miete (optional)
                  </label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.monthlyRent}
                      onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
                      placeholder="z.B. 1200"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Für genauere Rendite-Berechnung
                  </p>
                </div>

                {/* Baujahr */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Baujahr (optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.yearBuilt}
                      onChange={(e) => handleInputChange('yearBuilt', e.target.value)}
                      placeholder="z.B. 1995"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Calculate Button */}
                <button
                  onClick={handleCalculate}
                  disabled={!isFormValid || calculateScore.isPending}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isFormValid && !calculateScore.isPending
                      ? 'bg-gradient-to-r from-[#E31C5F] to-[#FF9500] text-white hover:opacity-90'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {calculateScore.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      AI-Score berechnen
                    </>
                  )}
                </button>

                {calculateScore.isError && (
                  <p className="text-sm text-red-500 text-center">
                    Fehler bei der Berechnung. Bitte versuchen Sie es erneut.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          <div>
            {result ? (
              <div className="space-y-4">
                <AIScoreCard
                  score={result.score}
                  propertyTitle={formData.location || 'Ihre Immobilie'}
                  description={result.summary}
                  factors={result.factors}
                />

                {/* Additional Metrics */}
                {result.grossYield && (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Zusätzliche Kennzahlen</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Bruttorendite</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {result.grossYield.toFixed(2)}%
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Preis pro m²</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {(parseFloat(formData.price) / parseFloat(formData.sqm)).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Noch kein Score berechnet
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm">
                  Geben Sie die Immobiliendaten ein und klicken Sie auf "AI-Score berechnen", um eine KI-gestützte Bewertung zu erhalten.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
