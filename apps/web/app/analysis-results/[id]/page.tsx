'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { SWOTAnalysis, type SWOTData } from '../../components/SWOTAnalysis';
import { DetailedEvaluation } from '../../components/DetailedEvaluation';
import { useAuthContext } from '@/app/providers/AuthProvider';
import { Header } from '../../components/Header';

export default function AnalysisResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const propertyId = params.id as string;

  // Financing state
  const [kaufpreisInput, setKaufpreisInput] = useState<number>(0);
  const [eigenkapital, setEigenkapital] = useState(20); // %
  const [zinssatz, setZinssatz] = useState(3.5); // %
  const [tilgungssatz, setTilgungssatz] = useState(2.0); // %
  const [kaltmieteInput, setKaltmieteInput] = useState<number>(0);
  const [hausgeldInput, setHausgeldInput] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingEvaluation, setIsGeneratingEvaluation] = useState(false);
  const [detailedEvaluation, setDetailedEvaluation] = useState<any>(null);

  // Fetch property data
  const { data: property, isLoading: propertyLoading } = trpc.properties.getById.useQuery(
    { id: propertyId },
    { enabled: !!propertyId }
  );

  // Mutations
  const addToFavorites = trpc.favorites.add.useMutation();
  const generateEvaluation = trpc.properties.generateDetailedEvaluation.useMutation();
  const utils = trpc.useContext();

  // Initialize inputs when property data loads
  useEffect(() => {
    if (property?.price) {
      setKaufpreisInput(property.price);
    }
    if (property?.ai_analysis?.estimated_rent) {
      const estimatedRent = property.ai_analysis.estimated_rent;
      setKaltmieteInput(estimatedRent);
    }
    if (property?.hausgeld) {
      setHausgeldInput(property.hausgeld);
    }
    // Load existing evaluation if available
    if (property?.ai_detailed_evaluation) {
      setDetailedEvaluation(property.ai_detailed_evaluation);
    }
  }, [property]);

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Analyse...</p>
        </div>
      </div>
    );
  }

  if (!property || !property.ai_analysis) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analyse nicht gefunden</h1>
          <p className="text-gray-600 mb-6">Diese Immobilie wurde noch nicht analysiert.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    );
  }

  const analysis = property.ai_analysis;

  // Calculate costs - use user input or fallback to property price
  const kaufpreis = kaufpreisInput || property.price || 0;
  const maklergebuehren = kaufpreis * 0.0357; // 3.57%
  const notargebuehren = kaufpreis * 0.015; // 1.5%
  const grunderwerbsteuer = kaufpreis * 0.065; // 6.5%
  const kaufnebenkosten = maklergebuehren + notargebuehren + grunderwerbsteuer;

  // Calculate financing
  const eigenkapitalBetrag = kaufpreis * (eigenkapital / 100);
  const darlehensbetrag = kaufpreis - eigenkapitalBetrag;
  const gesamtinvestition = eigenkapitalBetrag + kaufnebenkosten; // Bar zu zahlen
  const monatlicheRate = (darlehensbetrag * ((zinssatz + tilgungssatz) / 100)) / 12;
  const jahresZins = darlehensbetrag * (zinssatz / 100);
  const jahresTilgung = darlehensbetrag * (tilgungssatz / 100);

  // Use user-input kaltmiete or fallback to estimated rent
  const kaltmiete = kaltmieteInput || analysis.estimated_rent || 0;
  const jahresmiete = kaltmiete * 12;

  // Use user-input hausgeld or fallback to property value
  const hausgeld = hausgeldInput || property.hausgeld || 0;

  // Monthly Zins and Tilgung based on user input (from Finanzierungseinstellungen)
  const monatlicheZins = (darlehensbetrag * (zinssatz / 100)) / 12;
  const monatlicheTilgung = (darlehensbetrag * (tilgungssatz / 100)) / 12;

  // Calculate returns
  const estimatedOperatingCosts = analysis.estimated_operating_costs || 0;
  const estimatedMaintenanceCosts = analysis.estimated_maintenance_costs || 0;
  const jahresNebenkosten = estimatedOperatingCosts * 12;
  const jahresInstandhaltung = estimatedMaintenanceCosts * 12;
  const nettoMieteinnahmen = jahresmiete - jahresNebenkosten - jahresInstandhaltung;

  const bruttoMietrendite = kaufpreis > 0 ? (jahresmiete / kaufpreis) * 100 : 0;
  const nettoMietrendite = kaufpreis > 0 ? (nettoMieteinnahmen / kaufpreis) * 100 : 0;
  const eigenkapitalrendite = eigenkapitalBetrag > 0 ? ((nettoMieteinnahmen - jahresZins - jahresTilgung) / eigenkapitalBetrag) * 100 : 0;
  const faktor = bruttoMietrendite > 0 ? 100 / bruttoMietrendite : 0;

  // Monthly cashflow
  const monatlicheCashflow = kaltmiete - hausgeld - monatlicheZins - monatlicheTilgung;

  const pricePerSqm = property.sqm ? kaufpreis / property.sqm : 0;

  // Parse SWOT data
  const swotData: SWOTData = {
    strengths: analysis.strengths || [],
    weaknesses: analysis.weaknesses || [],
    opportunities: analysis.opportunities || [],
    risks: analysis.risks || [],
  };

  const handleSaveToFavorites = async () => {
    if (!user) {
      alert('Bitte melde dich an, um Favoriten zu speichern.');
      return;
    }

    setIsSaving(true);
    try {
      await addToFavorites.mutateAsync({ propertyId });
      // Invalidate favorites query to refresh
      utils.favorites.getAll.invalidate();
      // Navigate to favorites page
      router.push('/favorites');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        alert('Diese Immobilie ist bereits in deinen Favoriten.');
        // Navigate to favorites page anyway
        router.push('/favorites');
      } else {
        alert('Fehler beim Speichern: ' + error.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateEvaluation = async () => {
    if (!user) {
      alert('Bitte melde dich an, um eine Bewertung zu erstellen.');
      return;
    }

    setIsGeneratingEvaluation(true);
    try {
      const evaluation = await generateEvaluation.mutateAsync({ propertyId });
      setDetailedEvaluation(evaluation);
      // Invalidate property query to update cached data
      utils.properties.getById.invalidate({ id: propertyId });
    } catch (error: any) {
      alert('Fehler bei der Bewertung: ' + error.message);
    } finally {
      setIsGeneratingEvaluation(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Property Image */}
        <div className="mb-8">
          <div className="relative h-[400px] rounded-2xl overflow-hidden bg-gray-100">
            {property.images && property.images[0] ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Title and Key Metrics */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-6">{property.title || 'Immobilienanalyse'}</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Kaufpreis</div>
              <div className="text-2xl font-semibold text-[#484848]">
                {kaufpreis.toLocaleString('de-DE')} €
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Preis / m²</div>
              <div className="text-2xl font-semibold text-[#484848]">
                {pricePerSqm.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Wohnfläche</div>
              <div className="text-2xl font-semibold text-[#484848]">{property.sqm} m²</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Zimmer</div>
              <div className="text-2xl font-semibold text-[#484848]">{property.rooms}</div>
            </div>
          </div>
        </div>

        {/* Return Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#484848] mb-4">Rendite-Kennzahlen</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Bruttomietrendite</div>
              <div className="text-3xl font-semibold text-[#00A699]">
                {bruttoMietrendite.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">pro Jahr</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Nettomietrendite</div>
              <div className="text-3xl font-semibold text-[#00A699]">
                {nettoMietrendite.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">nach Nebenkosten</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Eigenkapitalrendite</div>
              <div className="text-3xl font-semibold text-[#00A699]">
                {eigenkapitalrendite.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Cash-on-Cash Return</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-sm text-gray-600 mb-1">Faktor</div>
              <div className="text-3xl font-semibold text-[#484848]">
                {faktor.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Kaufpreis / Jahresmiete</div>
            </div>
          </div>
        </div>

        {/* Financing Section with Cashflow */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[#484848] mb-4">Finanzierung & Cashflow</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-[#484848] mb-4">Kostenaufstellung</h3>
              <div className="space-y-3">
                {/* Kaufpreis Input */}
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <label className="font-medium text-gray-600">Kaufpreis</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={kaufpreisInput}
                      onChange={(e) => setKaufpreisInput(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F] text-right font-medium"
                    />
                    <span className="font-medium text-gray-900">€</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Maklergebühren (3,57%)</span>
                  <span className="font-medium text-gray-900">{maklergebuehren.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Notargebühren (1,5%)</span>
                  <span className="font-medium text-gray-900">{notargebuehren.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Grunderwerbsteuer (6,5%)</span>
                  <span className="font-medium text-gray-900">{grunderwerbsteuer.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between py-3 pt-4 border-t-2 border-gray-200">
                  <span className="text-lg font-semibold text-gray-900">Gesamtinvestition (bar)</span>
                  <span className="text-lg font-semibold text-gray-900">{gesamtinvestition.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
            </div>

            {/* Financing Settings */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-[#484848] mb-4">Finanzierungseinstellungen</h3>
              <div className="space-y-4">
                {/* Eigenkapital */}
                <div>
                  <label className="block font-medium text-gray-600 mb-2">Eigenkapital (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={eigenkapital}
                    onChange={(e) => setEigenkapital(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F]"
                  />
                  <div className="text-xs text-gray-600 mt-1">
                    {eigenkapitalBetrag.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
                  </div>
                </div>

                {/* Zinssatz und Tilgungssatz nebeneinander */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Zinssatz */}
                  <div>
                    <label className="block font-medium text-gray-600 mb-2">Zinssatz (% p.a.)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={zinssatz}
                      onChange={(e) => setZinssatz(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F]"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {jahresZins.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € / Jahr
                    </div>
                  </div>

                  {/* Tilgungssatz */}
                  <div>
                    <label className="block font-medium text-gray-600 mb-2">Tilgungssatz (% p.a.)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={tilgungssatz}
                      onChange={(e) => setTilgungssatz(Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F]"
                    />
                    <div className="text-xs text-gray-600 mt-1">
                      {jahresTilgung.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € / Jahr
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Darlehensbetrag</span>
                    <span className="font-medium text-gray-900">{darlehensbetrag.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Gesamtrate / Jahr</span>
                    <span className="font-semibold text-gray-900">{(jahresZins + jahresTilgung).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Rate / Monat</span>
                    <span className="font-semibold text-gray-900">{monatlicheRate.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Cashflow */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-[#484848] mb-4">Monatlicher Cashflow</h3>
              <div className="space-y-4">
                {/* Kaltmiete und Hausgeld untereinander */}
                <div className="space-y-4">
                  {/* Kaltmiete Input */}
                  <div>
                    <label className="block font-medium text-gray-600 mb-2">Kaltmiete/Monat</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={kaltmieteInput}
                        onChange={(e) => setKaltmieteInput(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F] text-right"
                      />
                      <span className="font-medium text-gray-900">€</span>
                    </div>
                  </div>

                  {/* Hausgeld Input */}
                  <div>
                    <label className="block font-medium text-gray-600 mb-2">Hausgeld/Monat</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={hausgeldInput}
                        onChange={(e) => setHausgeldInput(Number(e.target.value))}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5A5F] focus:border-[#FF5A5F] text-right"
                      />
                      <span className="font-medium text-gray-900">€</span>
                    </div>
                  </div>
                </div>

                {/* Cashflow Breakdown */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">+ Kaltmiete</span>
                    <span className="font-medium text-[#00A699]">{kaltmiete.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">- Hausgeld</span>
                    <span className="font-medium text-[#FF5A5F]">{hausgeld.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">- Zins</span>
                    <span className="font-medium text-[#FF5A5F]">{monatlicheZins.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200 pb-2">
                    <span className="text-gray-600">- Tilgung</span>
                    <span className="font-medium text-[#FF5A5F]">{monatlicheTilgung.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="text-lg font-semibold text-[#484848]">Cashflow/Monat</span>
                    <span className={`text-2xl font-bold ${monatlicheCashflow >= 0 ? 'text-[#00A699]' : 'text-[#FF5A5F]'}`}>
                      {monatlicheCashflow >= 0 ? '+' : ''}{monatlicheCashflow.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* SWOT Analysis */}
        <div className="mb-8">
          <SWOTAnalysis data={swotData} />
        </div>

        {/* Detailed AI Evaluation Section */}
        <div className="mb-8">
          {detailedEvaluation ? (
            <DetailedEvaluation data={detailedEvaluation} />
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow text-center">
              <h2 className="text-2xl font-semibold text-[#484848] mb-3">Detaillierte Investment-Bewertung</h2>
              <p className="text-gray-600 mb-6">
                Erhalte eine ausführliche Analyse von einem erfahrenen Immobilieninvestor mit Bewertungen zu Lage, Rendite, Entwicklungspotenzial und einem empfohlenen Verhandlungspreis.
              </p>
              <button
                onClick={handleGenerateEvaluation}
                disabled={isGeneratingEvaluation}
                className="px-8 py-3 bg-[#00A699] text-white rounded-xl font-semibold hover:bg-[#008F84] transition-all shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {isGeneratingEvaluation ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyse läuft...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>Detaillierte Bewertung erstellen</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pb-8">
          <button
            onClick={handleSaveToFavorites}
            disabled={isSaving}
            className="px-8 py-3 bg-[#FF5A5F] text-white rounded-xl font-semibold hover:bg-[#E0474D] transition-all shadow-sm hover:shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Speichere...' : 'Als Favorit speichern'}
          </button>
          <button
            onClick={() => router.back()}
            className="px-8 py-3 border-2 border-gray-300 bg-white text-[#484848] rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm hover:shadow-md"
          >
            ← Zurück
          </button>
        </div>
      </div>
    </div>
  );
}
